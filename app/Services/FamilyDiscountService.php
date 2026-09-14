<?php

namespace App\Services;

use App\Enums\SubscriptionStatus;
use App\Models\FamilyDiscountRule;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentPlanSubscription;

class FamilyDiscountService
{
    /**
     * Returns the family discount percentage for a guardian in an academic period.
     * Counts distinct children with active or pending_payment subscriptions in the period,
     * including the incoming student if not already counted.
     */
    public function calculateForGuardian(Guardian $guardian, int $periodId, Student $incomingStudent): float
    {
        $childrenCount = $this->countEligibleChildren($guardian, $periodId, $incomingStudent);

        $rule = FamilyDiscountRule::query()
            ->where('is_active', true)
            ->where('min_children_count', '<=', $childrenCount)
            ->orderByDesc('min_children_count')
            ->first();

        return $rule ? (float) $rule->discount_percentage : 0.0;
    }

    public function countEligibleChildren(Guardian $guardian, int $periodId, Student $incomingStudent): int
    {
        $studentIds = $guardian->students()->pluck('id');

        if ($studentIds->isEmpty()) {
            return 1;
        }

        $existingCount = StudentPlanSubscription::query()
            ->whereIn('student_id', $studentIds)
            ->where('period_id', $periodId)
            ->whereIn('status', [
                SubscriptionStatus::Active,
                SubscriptionStatus::PendingPayment,
            ])
            ->distinct()
            ->count('student_id');

        $incomingAlreadyCounted = StudentPlanSubscription::query()
            ->where('student_id', $incomingStudent->id)
            ->where('period_id', $periodId)
            ->whereIn('status', [
                SubscriptionStatus::Active,
                SubscriptionStatus::PendingPayment,
            ])
            ->exists();

        if (! $incomingAlreadyCounted) {
            return $existingCount + 1;
        }

        return $existingCount;
    }
}
