<?php

namespace App\Services;

use App\Enums\InstallmentStatus;
use App\Enums\SubscriptionFreezeStatus;
use App\Enums\SubscriptionStatus;
use App\Models\InvoiceInstallment;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Models\SubscriptionFreeze;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FreezeService
{
    /**
     * When a freeze is created without end_date, installment deferral uses this day count
     * until the freeze is ended and dates can be reconciled.
     */
    public const OPEN_FREEZE_INSTALLMENT_DEFERRAL_DAYS = 30;

    public function createFreeze(
        StudentPlanSubscription $subscription,
        Carbon $startDate,
        ?Carbon $endDate,
        string $reason,
        bool $pausesInstallments,
        bool $pausesAttendance,
        bool $extendsSubscription,
        User $createdBy,
    ): SubscriptionFreeze {
        $subscription->loadMissing(['invoice']);

        if ($subscription->status !== SubscriptionStatus::Active) {
            throw ValidationException::withMessages([
                'subscription' => ['يمكن تجميد الاشتراكات النشطة فقط.'],
            ])->status(422);
        }

        $hasActiveFreeze = SubscriptionFreeze::query()
            ->where('student_plan_subscription_id', $subscription->id)
            ->where('status', SubscriptionFreezeStatus::Active)
            ->exists();

        if ($hasActiveFreeze) {
            throw ValidationException::withMessages([
                'subscription' => ['يوجد تجميد نشط على هذا الاشتراك بالفعل.'],
            ])->status(409);
        }

        if ($endDate && $endDate->lt($startDate)) {
            throw ValidationException::withMessages([
                'end_date' => ['تاريخ نهاية التجميد يجب أن يكون بعد تاريخ البداية.'],
            ])->status(422);
        }

        $freezeDays = $this->freezeDayCount($startDate, $endDate);
        $previousStatus = $subscription->status->value;

        $freeze = DB::transaction(function () use (
            $subscription,
            $startDate,
            $endDate,
            $reason,
            $pausesInstallments,
            $pausesAttendance,
            $extendsSubscription,
            $createdBy,
            $freezeDays,
            $previousStatus,
        ) {
            $freeze = SubscriptionFreeze::query()->create([
                'student_plan_subscription_id' => $subscription->id,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate?->toDateString(),
                'reason' => $reason,
                'pauses_installments' => $pausesInstallments,
                'pauses_attendance_expectation' => $pausesAttendance,
                'extends_subscription' => $extendsSubscription,
                'previous_status' => $previousStatus,
                'status' => SubscriptionFreezeStatus::Active,
                'created_by' => $createdBy->id,
            ]);

            $subscription->update(['status' => SubscriptionStatus::Frozen]);

            if ($pausesInstallments) {
                $this->deferInstallmentsWithinFreeze($subscription, $startDate, $endDate, $freezeDays);
            }

            if ($extendsSubscription && $subscription->ends_at) {
                $subscription->update([
                    'ends_at' => Carbon::parse($subscription->ends_at)->addDays($freezeDays),
                ]);
            }

            return $freeze->load(['subscription', 'creator']);
        });

        AuditLogService::log(
            'subscription.frozen',
            $subscription,
            sprintf(
                'جمّد الاشتراك #%d من %s%s، السبب: %s',
                $subscription->id,
                $startDate->toDateString(),
                $endDate ? ' إلى '.$endDate->toDateString() : '',
                $reason,
            ),
            ['status' => $previousStatus],
            [
                'status' => SubscriptionStatus::Frozen->value,
                'freeze_id' => $freeze->id,
                'reason' => $reason,
            ],
            $createdBy,
        );

        return $freeze;
    }

    public function endFreeze(SubscriptionFreeze $freeze, ?Carbon $actualEndDate = null): SubscriptionFreeze
    {
        if ($freeze->status === SubscriptionFreezeStatus::Ended) {
            throw ValidationException::withMessages([
                'freeze' => ['هذا التجميد منتهٍ بالفعل.'],
            ])->status(409);
        }

        $freeze->loadMissing('subscription');
        $subscription = $freeze->subscription;

        if (! $subscription) {
            throw ValidationException::withMessages([
                'freeze' => ['الاشتراك المرتبط بهذا التجميد غير موجود.'],
            ])->status(404);
        }

        $freeze = DB::transaction(function () use ($freeze, $subscription, $actualEndDate) {
            $resolvedEnd = ($actualEndDate ?? Carbon::today())->toDateString();

            $freeze->update([
                'end_date' => $resolvedEnd,
                'status' => SubscriptionFreezeStatus::Ended,
            ]);

            $restoredStatus = SubscriptionStatus::tryFrom($freeze->previous_status)
                ?? SubscriptionStatus::Active;

            $subscription->update(['status' => $restoredStatus]);

            return $freeze->fresh(['subscription', 'creator']);
        });

        AuditLogService::log(
            'subscription.unfrozen',
            $subscription,
            sprintf(
                'أنهى تجميد الاشتراك #%d (تجميد #%d)، تاريخ النهاية: %s',
                $subscription->id,
                $freeze->id,
                $freeze->end_date?->toDateString() ?? (string) $freeze->end_date,
            ),
            ['status' => SubscriptionStatus::Frozen->value],
            ['status' => $subscription->fresh()->status->value, 'freeze_id' => $freeze->id],
            auth()->user(),
        );

        return $freeze;
    }

    /**
     * @return Collection<int, SubscriptionFreeze>
     */
    public function listForSubscription(StudentPlanSubscription $subscription): Collection
    {
        return $subscription->freezes()
            ->with('creator')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    public function isStudentFrozen(int $studentId, ?int $periodId = null): bool
    {
        return StudentPlanSubscription::query()
            ->where('student_id', $studentId)
            ->where('status', SubscriptionStatus::Frozen)
            ->when($periodId, fn ($q) => $q->where('period_id', $periodId))
            ->exists();
    }

    public function assertStudentNotFrozen(Student $student, ?int $periodId = null): void
    {
        if ($this->isStudentFrozen($student->id, $periodId)) {
            throw ValidationException::withMessages([
                'student_id' => ['لا يمكن تسجيل الطالب في مواد جديدة أثناء تجميد اشتراكه.'],
            ])->status(422);
        }
    }

    private function freezeDayCount(Carbon $startDate, ?Carbon $endDate): int
    {
        if ($endDate) {
            return max(1, $startDate->diffInDays($endDate));
        }

        return self::OPEN_FREEZE_INSTALLMENT_DEFERRAL_DAYS;
    }

    private function deferInstallmentsWithinFreeze(
        StudentPlanSubscription $subscription,
        Carbon $startDate,
        ?Carbon $endDate,
        int $freezeDays,
    ): void {
        if (! $subscription->invoice_id) {
            return;
        }

        $query = InvoiceInstallment::query()
            ->where('invoice_id', $subscription->invoice_id)
            ->where('status', InstallmentStatus::Pending)
            ->whereDate('due_date', '>=', $startDate->toDateString());

        if ($endDate) {
            $query->whereDate('due_date', '<=', $endDate->toDateString());
        }

        foreach ($query->get() as $installment) {
            $installment->update([
                'due_date' => Carbon::parse($installment->due_date)->addDays($freezeDays)->toDateString(),
            ]);
        }
    }
}
