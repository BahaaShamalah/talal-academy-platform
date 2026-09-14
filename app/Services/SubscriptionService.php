<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\SubjectSelectionMode;
use App\Enums\SubscriptionStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Plan;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Models\SubscriptionSelectedSubject;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class SubscriptionService
{
    public function __construct(
        private readonly CouponService $couponService,
        private readonly AutoEnrollmentService $autoEnrollmentService,
        private readonly InstallmentService $installmentService,
        private readonly InvoiceFulfillmentService $invoiceFulfillmentService,
        private readonly FamilyDiscountService $familyDiscountService,
        private readonly CreditService $creditService,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @param  list<int>|null  $selectedSubjectIds
     * @return array{invoice: Invoice, subscription: StudentPlanSubscription}
     */
    public function subscribeStudentToPlan(
        Student $student,
        Plan $plan,
        ?User $createdBy = null,
        ?string $couponCode = null,
        ?array $selectedSubjectIds = null,
        string $paymentMode = 'full',
        bool $applyCredit = false,
    ): array {
        $existing = StudentPlanSubscription::query()
            ->where('student_id', $student->id)
            ->where('plan_id', $plan->id)
            ->whereIn('status', [
                SubscriptionStatus::PendingPayment,
                SubscriptionStatus::Active,
            ])
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'plan_id' => ['الطالب لديه اشتراك نشط أو بانتظار الدفع على هذه الباقة بالفعل.'],
            ])->status(409);
        }

        $plan->loadMissing(['grade', 'educationalStage', 'period', 'subject', 'productType', 'installmentTemplate']);

        $this->assertStudentEligibleForPlan($student, $plan);

        $normalizedSubjectIds = $this->normalizeSelectedSubjects($plan, $selectedSubjectIds, $student);

        if ($paymentMode === 'installment' && ! $plan->installment_template_id) {
            throw ValidationException::withMessages([
                'payment_mode' => ['هذه الباقة لا تدعم التقسيط'],
            ])->status(422);
        }

        $result = DB::transaction(function () use ($student, $plan, $createdBy, $couponCode, $normalizedSubjectIds, $paymentMode, $applyCredit) {
            $subtotal = number_format((float) $plan->price, 3, '.', '');
            $couponDiscountAmount = '0.000';
            $couponId = null;

            if ($couponCode !== null && trim($couponCode) !== '') {
                $applied = $this->couponService->validateAndApply($couponCode, $plan, lockForUpdate: true);
                $couponDiscountAmount = $applied['discount_amount'];
                $couponId = $applied['coupon']->id;

                $applied['coupon']->increment('used_count');
            }

            // Discount order: coupon → family discount → guardian credit → final total.
            $afterCoupon = max(0, (float) $subtotal - (float) $couponDiscountAmount);

            $student->loadMissing('guardian');
            $guardian = $student->guardian;
            $familyDiscountPercentage = 0.0;
            $familyDiscountAmount = '0.000';

            if ($guardian && $plan->period_id) {
                $familyDiscountPercentage = $this->familyDiscountService->calculateForGuardian(
                    $guardian,
                    (int) $plan->period_id,
                    $student,
                );
                if ($familyDiscountPercentage > 0) {
                    $familyDiscountAmount = number_format(
                        $afterCoupon * $familyDiscountPercentage / 100,
                        3,
                        '.',
                        '',
                    );
                }
            }

            $afterFamily = max(0, $afterCoupon - (float) $familyDiscountAmount);
            $creditAppliedAmount = '0.000';
            $total = number_format($afterFamily, 3, '.', '');

            $invoice = Invoice::query()->create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'student_id' => $student->id,
                'period_id' => $plan->period_id,
                'coupon_id' => $couponId,
                'status' => InvoiceStatus::Pending,
                'subtotal' => $subtotal,
                'coupon_discount_amount' => $couponDiscountAmount,
                'family_discount_percentage' => $familyDiscountPercentage > 0 ? $familyDiscountPercentage : null,
                'family_discount_amount' => $familyDiscountAmount,
                'credit_applied_amount' => $creditAppliedAmount,
                'total' => $total,
                'created_by' => $createdBy?->id,
            ]);

            if ($applyCredit && $guardian && $afterFamily > 0) {
                $creditAppliedAmount = $this->creditService->applyToInvoice(
                    $guardian,
                    $invoice,
                    $afterFamily,
                    $createdBy,
                );
                $finalTotal = number_format(max(0, $afterFamily - (float) $creditAppliedAmount), 3, '.', '');
                $invoice->update([
                    'credit_applied_amount' => $creditAppliedAmount,
                    'total' => $finalTotal,
                ]);
            }

            InvoiceItem::query()->create([
                'invoice_id' => $invoice->id,
                'itemable_type' => Plan::class,
                'itemable_id' => $plan->id,
                'description' => $this->buildPlanDescription($plan),
                'unit_price' => $subtotal,
                'quantity' => 1,
                'line_total' => $subtotal,
            ]);

            $subscription = StudentPlanSubscription::query()->create([
                'student_id' => $student->id,
                'plan_id' => $plan->id,
                'invoice_id' => $invoice->id,
                'period_id' => $plan->period_id,
                'status' => SubscriptionStatus::PendingPayment,
            ]);

            foreach ($normalizedSubjectIds as $subjectId) {
                SubscriptionSelectedSubject::query()->create([
                    'student_plan_subscription_id' => $subscription->id,
                    'subject_id' => $subjectId,
                ]);
            }

            if ($paymentMode === 'installment' && $plan->installmentTemplate) {
                $this->installmentService->generateForInvoice($invoice, $plan->installmentTemplate);
            }

            $subscription = $subscription->load([
                'plan.grade.subjects',
                'plan.productType',
                'plan.subject',
                'selectedSubjects.subject',
                'invoice',
            ]);

            $this->autoEnrollmentService->enrollAfterActivation($subscription);

            return [
                'invoice' => $invoice->load(['items', 'student.guardian', 'coupon', 'installments']),
                'subscription' => $subscription->fresh()->load(['plan.productType', 'invoice', 'selectedSubjects.subject']),
            ];
        });

        $invoice = $result['invoice'];
        if ($invoice->student) {
            $this->notificationService->notifyStudentGuardian($invoice->student, 'invoice_issued', [
                'invoice_number' => $invoice->invoice_number,
                'amount' => $invoice->total,
            ]);
        }

        return $result;
    }

    /**
     * @param  list<int>|null  $selectedSubjectIds
     * @return list<int>
     */
    private function normalizeSelectedSubjects(Plan $plan, ?array $selectedSubjectIds, Student $student): array
    {
        $mode = $plan->productType?->subject_selection_mode;

        if ($mode !== SubjectSelectionMode::ChooseSubjects) {
            return [];
        }

        $ids = collect($selectedSubjectIds ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $required = (int) $plan->subject_selection_count;

        if (count($ids) !== $required) {
            throw ValidationException::withMessages([
                'selected_subject_ids' => ["يجب اختيار {$required} مواد بالضبط"],
            ]);
        }

        $gradeId = $plan->resolveGradeIdForStudent($student) ?? ($plan->grade_id ? (int) $plan->grade_id : null);

        if (! $gradeId) {
            throw ValidationException::withMessages([
                'plan_id' => ['هذه الباقة غير مرتبطة بصف/مرحلة صالحة للطالب، لا يمكن اختيار مواد لها.'],
            ]);
        }

        $allowed = DB::table('grade_subjects')
            ->where('grade_id', $gradeId)
            ->whereIn('subject_id', $ids)
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $missing = array_diff($ids, $allowed);
        if ($missing !== []) {
            throw ValidationException::withMessages([
                'selected_subject_ids' => ['إحدى المواد المختارة غير متاحة لهذا الصف.'],
            ]);
        }

        return $ids;
    }

    private function assertStudentEligibleForPlan(Student $student, Plan $plan): void
    {
        if (! $plan->educational_stage_id) {
            return;
        }

        $student->loadMissing('currentGrade');
        if (! $student->currentGrade
            || (int) $student->currentGrade->educational_stage_id !== (int) $plan->educational_stage_id) {
            throw ValidationException::withMessages([
                'plan_id' => ['صف الطالب الحالي ليس ضمن مرحلة هذه الباقة.'],
            ]);
        }
    }

    public function markInvoicePaid(Invoice $invoice, PaymentMethod $paymentMethod): Invoice
    {
        if ($invoice->status === InvoiceStatus::Paid) {
            throw ValidationException::withMessages([
                'invoice' => ['الفاتورة مدفوعة بالفعل.'],
            ]);
        }

        if ($invoice->status !== InvoiceStatus::Pending) {
            throw ValidationException::withMessages([
                'invoice' => ['لا يمكن تسجيل دفع لفاتورة بهذه الحالة.'],
            ]);
        }

        $invoice = DB::transaction(function () use ($invoice, $paymentMethod) {
            $invoice->update([
                'status' => InvoiceStatus::Paid,
                'paid_at' => now(),
                'payment_method' => $paymentMethod,
            ]);

            $this->activateInvoiceFulfillment($invoice);

            return $invoice->refresh()->load(['items', 'student.guardian', 'subscriptions.plan', 'order', 'installments']);
        });

        $guardian = $invoice->student?->guardian;
        if ($guardian) {
            $this->notificationService->send($guardian, 'payment_received', [
                'student_name' => $invoice->student->full_name,
                'amount' => $invoice->total,
                'invoice_number' => $invoice->invoice_number,
            ]);
        }

        AuditLogService::log(
            'invoice.mark_paid',
            $invoice,
            sprintf(
                'سجّل دفع الفاتورة %s بمبلغ %s د.ك بطريقة %s',
                $invoice->invoice_number,
                $invoice->total,
                $paymentMethod->value,
            ),
            ['status' => InvoiceStatus::Pending->value],
            [
                'status' => InvoiceStatus::Paid->value,
                'payment_method' => $paymentMethod->value,
                'amount' => $invoice->total,
            ],
            auth()->user(),
        );

        return $invoice;
    }

    public function activateInvoiceFulfillment(Invoice $invoice): void
    {
        $this->invoiceFulfillmentService->activate($invoice);
    }

    public function cancelSubscription(StudentPlanSubscription $subscription, string $reason): StudentPlanSubscription
    {
        if ($subscription->status === SubscriptionStatus::Cancelled) {
            throw ValidationException::withMessages([
                'subscription' => ['الاشتراك ملغى بالفعل.'],
            ])->status(409);
        }

        $subscription->update([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
        ]);

        return $subscription->refresh();
    }

    /**
     * @return LengthAwarePaginator<int, StudentPlanSubscription>
     */
    public function listForStudent(Student $student, Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(StudentPlanSubscription::class)
            ->where('student_id', $student->id)
            ->allowedIncludes(
                AllowedInclude::relationship('plan'),
                AllowedInclude::relationship('invoice'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    private function generateInvoiceNumber(): string
    {
        $year = now()->format('Y');

        $maxSequence = Invoice::query()
            ->lockForUpdate()
            ->pluck('invoice_number')
            ->map(function (?string $invoiceNumber) use ($year) {
                if ($invoiceNumber === null || ! preg_match('/^INV-(\d{4})-(\d{5})$/', $invoiceNumber, $matches)) {
                    return 0;
                }

                if ($matches[1] !== $year) {
                    return 0;
                }

                return (int) $matches[2];
            })
            ->max() ?? 0;

        return sprintf('INV-%s-%05d', $year, $maxSequence + 1);
    }

    private function buildPlanDescription(Plan $plan): string
    {
        $parts = [$plan->name];

        if ($plan->grade) {
            $parts[] = $plan->grade->name;
        } elseif ($plan->educationalStage) {
            $parts[] = $plan->educationalStage->name.' (جميع الصفوف)';
        }

        if ($plan->period) {
            $parts[] = $plan->period->name;
        }

        return implode(' — ', $parts);
    }
}
