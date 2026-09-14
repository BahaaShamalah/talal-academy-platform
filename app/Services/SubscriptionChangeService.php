<?php

namespace App\Services;

use App\Enums\CreditTransactionType;
use App\Enums\EnrollmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\SubjectSelectionMode;
use App\Enums\SubscriptionChangeType;
use App\Enums\SubscriptionStatus;
use App\Models\CreditTransaction;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Plan;
use App\Models\StudentPlanSubscription;
use App\Models\Subject;
use App\Models\SubscriptionChange;
use App\Models\SubscriptionSelectedSubject;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionChangeService
{
    public function __construct(
        private readonly AutoEnrollmentService $autoEnrollmentService,
        private readonly EnrollmentService $enrollmentService,
    ) {}

    public function changePlan(
        StudentPlanSubscription $subscription,
        Plan $newPlan,
        ?float $manualAmountOverride,
        string $reason,
        User $createdBy,
    ): SubscriptionChange {
        $this->assertActiveSubscription($subscription);

        $subscription->loadMissing(['plan.productType', 'student.guardian']);
        $oldPlan = $subscription->plan;

        if ((int) $oldPlan->id === (int) $newPlan->id) {
            throw ValidationException::withMessages([
                'new_plan_id' => ['الباقة الجديدة مطابقة للباقة الحالية.'],
            ])->status(422);
        }

        $newPlan->loadMissing(['productType', 'grade', 'period']);

        $oldSubjectIds = $this->coveredSubjectIds($subscription);

        $calculated = round((float) $newPlan->price - (float) $oldPlan->price, 3);
        $final = $manualAmountOverride !== null
            ? round($manualAmountOverride, 3)
            : $calculated;

        $change = DB::transaction(function () use (
            $subscription,
            $oldPlan,
            $newPlan,
            $calculated,
            $final,
            $reason,
            $createdBy,
            $oldSubjectIds,
        ) {
            $supplementaryInvoice = null;
            $creditTransaction = null;

            if ($final > 0) {
                $supplementaryInvoice = $this->createSupplementaryInvoice(
                    $subscription,
                    $final,
                    $newPlan,
                    'فرق ترقية باقة',
                    $createdBy,
                );
            } elseif ($final < 0) {
                $creditTransaction = $this->createGuardianCredit(
                    $subscription,
                    abs($final),
                    'فرق تخفيض باقة',
                    $createdBy,
                );
            }

            $subscription->update(['plan_id' => $newPlan->id]);
            $subscription->refresh();

            $this->enrollNewSubjectsOnly($subscription, $oldSubjectIds);

            return SubscriptionChange::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'change_type' => SubscriptionChangeType::PlanChange,
                'old_plan_id' => $oldPlan->id,
                'new_plan_id' => $newPlan->id,
                'subject_id' => null,
                'calculated_amount_difference' => number_format($calculated, 3, '.', ''),
                'final_amount_difference' => number_format($final, 3, '.', ''),
                'supplementary_invoice_id' => $supplementaryInvoice?->id,
                'credit_transaction_id' => $creditTransaction?->id,
                'reason' => $reason,
                'created_by' => $createdBy->id,
            ])->load([
                'oldPlan',
                'newPlan',
                'supplementaryInvoice',
                'creditTransaction',
                'creator',
            ]);
        });

        $this->auditSubscriptionChange($change, $subscription, $createdBy);

        return $change;
    }

    public function addSubject(
        StudentPlanSubscription $subscription,
        int $subjectId,
        ?float $manualAmountOverride,
        string $reason,
        User $createdBy,
    ): SubscriptionChange {
        $this->assertActiveSubscription($subscription);
        $this->assertChooseSubjectsPlan($subscription);

        $subscription->loadMissing(['plan.productType', 'plan.grade', 'plan.educationalStage', 'selectedSubjects', 'student.guardian', 'student.currentGrade']);
        $plan = $subscription->plan;

        if ($plan->subject_selection_count <= 0) {
            throw ValidationException::withMessages([
                'subscription' => ['الباقة لا تحتوي على عدد مواد صالح لحساب سعر المادة.'],
            ])->status(422);
        }

        $existingIds = $subscription->selectedSubjects->pluck('subject_id')->map(fn ($id) => (int) $id)->all();

        if (in_array($subjectId, $existingIds, true)) {
            throw ValidationException::withMessages([
                'subject_id' => ['المادة مضافة بالفعل لهذا الاشتراك.'],
            ])->status(422);
        }

        $gradeId = $plan->resolveGradeIdForStudent($subscription->student) ?? ($plan->grade_id ? (int) $plan->grade_id : null);

        if (! $gradeId) {
            throw ValidationException::withMessages([
                'subscription' => ['الباقة غير مرتبطة بصف/مرحلة صالحة للطالب.'],
            ])->status(422);
        }

        $allowed = DB::table('grade_subjects')
            ->where('grade_id', $gradeId)
            ->where('subject_id', $subjectId)
            ->exists();

        if (! $allowed) {
            throw ValidationException::withMessages([
                'subject_id' => ['المادة غير متاحة لصف هذه الباقة.'],
            ])->status(422);
        }

        // Estimated per-subject price (simple division — admin may override manually).
        $calculated = round((float) $plan->price / (int) $plan->subject_selection_count, 3);
        $final = $manualAmountOverride !== null
            ? round($manualAmountOverride, 3)
            : $calculated;

        $change = DB::transaction(function () use (
            $subscription,
            $plan,
            $subjectId,
            $calculated,
            $final,
            $reason,
            $createdBy,
        ) {
            $supplementaryInvoice = null;

            if ($final > 0) {
                $supplementaryInvoice = $this->createSupplementaryInvoice(
                    $subscription,
                    $final,
                    $plan,
                    'إضافة مادة للاشتراك',
                    $createdBy,
                );
            } elseif ($final < 0) {
                throw ValidationException::withMessages([
                    'manual_amount_override' => ['إضافة مادة تتطلب مبلغًا إضافيًا موجبًا أو صفرًا.'],
                ])->status(422);
            }

            SubscriptionSelectedSubject::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'subject_id' => $subjectId,
            ]);

            $subscription->unsetRelation('selectedSubjects');
            $this->enrollViaTemporarySelectedSubjects($subscription, [$subjectId]);

            return SubscriptionChange::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'change_type' => SubscriptionChangeType::AddSubject,
                'old_plan_id' => $plan->id,
                'new_plan_id' => null,
                'subject_id' => $subjectId,
                'calculated_amount_difference' => number_format($calculated, 3, '.', ''),
                'final_amount_difference' => number_format($final, 3, '.', ''),
                'supplementary_invoice_id' => $supplementaryInvoice?->id,
                'credit_transaction_id' => null,
                'reason' => $reason,
                'created_by' => $createdBy->id,
            ])->load([
                'subject',
                'supplementaryInvoice',
                'creator',
            ]);
        });

        $this->auditSubscriptionChange($change, $subscription, $createdBy);

        return $change;
    }

    public function removeSubject(
        StudentPlanSubscription $subscription,
        int $subjectId,
        ?float $manualAmountOverride,
        string $reason,
        User $createdBy,
    ): SubscriptionChange {
        $this->assertActiveSubscription($subscription);
        $this->assertChooseSubjectsPlan($subscription);

        $subscription->loadMissing(['plan.productType', 'selectedSubjects', 'student.guardian']);
        $plan = $subscription->plan;

        if ($plan->subject_selection_count <= 0) {
            throw ValidationException::withMessages([
                'subscription' => ['الباقة لا تحتوي على عدد مواد صالح لحساب سعر المادة.'],
            ])->status(422);
        }

        $row = $subscription->selectedSubjects->firstWhere('subject_id', $subjectId);

        if (! $row) {
            throw ValidationException::withMessages([
                'subject_id' => ['المادة غير موجودة في اشتراك الطالب.'],
            ])->status(422);
        }

        // Estimated per-subject credit (simple division — admin may override manually).
        $calculated = round(-((float) $plan->price / (int) $plan->subject_selection_count), 3);
        $final = $manualAmountOverride !== null
            ? round($manualAmountOverride, 3)
            : $calculated;

        $change = DB::transaction(function () use (
            $subscription,
            $plan,
            $subjectId,
            $row,
            $calculated,
            $final,
            $reason,
            $createdBy,
        ) {
            $creditTransaction = null;

            // Remove subject first so retryWaitingStudents does not re-place this student.
            $row->delete();
            $subscription->unsetRelation('selectedSubjects');

            $this->cancelActiveEnrollmentsForSubject($subscription, $subjectId);

            if ($final < 0) {
                $creditTransaction = $this->createGuardianCredit(
                    $subscription,
                    abs($final),
                    'فرق حذف مادة من الاشتراك',
                    $createdBy,
                );
            } elseif ($final > 0) {
                throw ValidationException::withMessages([
                    'manual_amount_override' => ['حذف مادة يُنتج رصيدًا سالبًا أو صفرًا فقط.'],
                ])->status(422);
            }

            return SubscriptionChange::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'change_type' => SubscriptionChangeType::RemoveSubject,
                'old_plan_id' => $plan->id,
                'new_plan_id' => null,
                'subject_id' => $subjectId,
                'calculated_amount_difference' => number_format($calculated, 3, '.', ''),
                'final_amount_difference' => number_format($final, 3, '.', ''),
                'supplementary_invoice_id' => null,
                'credit_transaction_id' => $creditTransaction?->id,
                'reason' => $reason,
                'created_by' => $createdBy->id,
            ])->load([
                'subject',
                'creditTransaction',
                'creator',
            ]);
        });

        $this->auditSubscriptionChange($change, $subscription, $createdBy);

        return $change;
    }

    /**
     * @return Collection<int, SubscriptionChange>
     */
    public function listForSubscription(StudentPlanSubscription $subscription): Collection
    {
        return SubscriptionChange::query()
            ->where('student_plan_subscription_id', $subscription->id)
            ->with([
                'oldPlan',
                'newPlan',
                'subject',
                'supplementaryInvoice',
                'creditTransaction',
                'creator',
            ])
            ->orderByDesc('created_at')
            ->get();
    }

    private function assertActiveSubscription(StudentPlanSubscription $subscription): void
    {
        if ($subscription->status !== SubscriptionStatus::Active) {
            throw ValidationException::withMessages([
                'subscription' => ['التعديل متاح للاشتراكات النشطة فقط.'],
            ])->status(422);
        }
    }

    private function assertChooseSubjectsPlan(StudentPlanSubscription $subscription): void
    {
        $subscription->loadMissing('plan.productType');

        if ($subscription->plan?->productType?->subject_selection_mode !== SubjectSelectionMode::ChooseSubjects) {
            throw ValidationException::withMessages([
                'subscription' => ['إضافة/حذف المواد متاح لباقات اختيار المواد فقط.'],
            ])->status(422);
        }
    }

    /**
     * @return list<int>
     */
    private function coveredSubjectIds(StudentPlanSubscription $subscription): array
    {
        return collect($this->autoEnrollmentService->getCoveredSubjects($subscription))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Enroll only subjects that were not covered before a plan change.
     *
     * @param  list<int>  $oldSubjectIds
     */
    private function enrollNewSubjectsOnly(StudentPlanSubscription $subscription, array $oldSubjectIds): void
    {
        $subscription->refresh()->loadMissing([
            'plan.productType',
            'selectedSubjects',
        ]);

        $newIds = $this->coveredSubjectIds($subscription);
        $diffIds = array_values(array_diff($newIds, $oldSubjectIds));

        if ($diffIds === []) {
            return;
        }

        $mode = $subscription->plan?->productType?->subject_selection_mode;

        if ($mode === SubjectSelectionMode::ChooseSubjects) {
            $this->enrollViaTemporarySelectedSubjects($subscription, $diffIds);

            return;
        }

        $this->autoEnrollmentService->enrollAfterActivation($subscription);
    }

    /**
     * Temporarily restrict selected subjects so AutoEnrollmentService enrolls only the given IDs.
     *
     * @param  list<int>  $subjectIdsOnly
     */
    private function enrollViaTemporarySelectedSubjects(StudentPlanSubscription $subscription, array $subjectIdsOnly): void
    {
        $subscription->loadMissing('selectedSubjects');

        $allSubjectIds = $subscription->selectedSubjects
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        SubscriptionSelectedSubject::query()
            ->where('student_plan_subscription_id', $subscription->id)
            ->delete();

        foreach ($subjectIdsOnly as $subjectId) {
            SubscriptionSelectedSubject::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'subject_id' => $subjectId,
            ]);
        }

        $subscription->unsetRelation('selectedSubjects');
        $this->autoEnrollmentService->enrollAfterActivation($subscription);

        SubscriptionSelectedSubject::query()
            ->where('student_plan_subscription_id', $subscription->id)
            ->delete();

        foreach ($allSubjectIds as $subjectId) {
            SubscriptionSelectedSubject::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'subject_id' => $subjectId,
            ]);
        }

        $subscription->unsetRelation('selectedSubjects');
    }

    private function cancelActiveEnrollmentsForSubject(StudentPlanSubscription $subscription, int $subjectId): void
    {
        $subscription->loadMissing(['plan', 'student.currentGrade']);

        $gradeId = $subscription->plan->resolveGradeIdForStudent($subscription->student)
            ?? ($subscription->plan->grade_id ? (int) $subscription->plan->grade_id : 0);
        $periodId = $subscription->period_id ? (int) $subscription->period_id : null;

        $enrollments = Enrollment::query()
            ->where('student_id', $subscription->student_id)
            ->whereIn('status', [
                EnrollmentStatus::Active,
                EnrollmentStatus::PendingPayment,
            ])
            ->whereHas('classOffering', function ($q) use ($subjectId, $gradeId, $periodId) {
                $q->where('subject_id', $subjectId)->where('grade_id', $gradeId);
                if ($periodId) {
                    $q->where('period_id', $periodId);
                }
            })
            ->get();

        foreach ($enrollments as $enrollment) {
            $this->enrollmentService->delete($enrollment);
        }
    }

    private function createSupplementaryInvoice(
        StudentPlanSubscription $subscription,
        float $amount,
        Plan $itemPlan,
        string $description,
        User $createdBy,
    ): Invoice {
        $subscription->loadMissing('student');
        $formatted = number_format($amount, 3, '.', '');

        $invoice = Invoice::query()->create([
            'invoice_number' => $this->generateInvoiceNumber(),
            'student_id' => $subscription->student_id,
            'period_id' => $subscription->period_id,
            'status' => InvoiceStatus::Pending,
            'subtotal' => $formatted,
            'coupon_discount_amount' => '0.000',
            'family_discount_amount' => '0.000',
            'credit_applied_amount' => '0.000',
            'total' => $formatted,
            'created_by' => $createdBy->id,
            'notes' => $description,
        ]);

        InvoiceItem::query()->create([
            'invoice_id' => $invoice->id,
            'itemable_type' => Plan::class,
            'itemable_id' => $itemPlan->id,
            'description' => $description,
            'unit_price' => $formatted,
            'quantity' => 1,
            'line_total' => $formatted,
        ]);

        return $invoice;
    }

    private function auditSubscriptionChange(
        SubscriptionChange $change,
        StudentPlanSubscription $subscription,
        User $createdBy,
    ): void {
        $typeLabel = match ($change->change_type) {
            SubscriptionChangeType::PlanChange => 'تغيير باقة',
            SubscriptionChangeType::AddSubject => 'إضافة مادة',
            SubscriptionChangeType::RemoveSubject => 'حذف مادة',
        };

        AuditLogService::log(
            'subscription.changed',
            $subscription,
            sprintf(
                '%s للاشتراك #%d، الفرق المالي: %s د.ك، السبب: %s (سجل تغيير #%d)',
                $typeLabel,
                $subscription->id,
                $change->final_amount_difference,
                $change->reason,
                $change->id,
            ),
            null,
            [
                'subscription_change_id' => $change->id,
                'change_type' => $change->change_type->value,
                'final_amount_difference' => $change->final_amount_difference,
            ],
            $createdBy,
        );
    }

    private function createGuardianCredit(
        StudentPlanSubscription $subscription,
        float $amount,
        string $notes,
        User $createdBy,
    ): CreditTransaction {
        $subscription->loadMissing('student.guardian');
        $guardian = $subscription->student?->guardian;

        if (! $guardian) {
            throw ValidationException::withMessages([
                'subscription' => ['لا يمكن إنشاء رصيد بدون ولي أمر مرتبط بالطالب.'],
            ])->status(422);
        }

        return CreditTransaction::query()->create([
            'guardian_id' => $guardian->id,
            'amount' => number_format($amount, 3, '.', ''),
            'type' => CreditTransactionType::ManualAdjustment,
            'notes' => $notes,
            'created_by' => $createdBy->id,
        ]);
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
}
