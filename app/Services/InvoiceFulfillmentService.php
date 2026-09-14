<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PlanDurationType;
use App\Enums\PrivateLessonBookingStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Plan;
use App\Models\PrivateLessonBooking;
use App\Models\StudentPlanSubscription;
use Illuminate\Support\Carbon;

class InvoiceFulfillmentService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    public function activate(Invoice $invoice): void
    {
        $this->activateSubscriptions($invoice);
        $this->activateOrders($invoice);
        $this->activatePrivateLessonBookings($invoice);
    }

    private function activateSubscriptions(Invoice $invoice): void
    {
        $subscriptions = StudentPlanSubscription::query()
            ->where('invoice_id', $invoice->id)
            ->where('status', SubscriptionStatus::PendingPayment)
            ->with(['plan', 'student.guardian'])
            ->lockForUpdate()
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $startsAt = now();

        foreach ($subscriptions as $subscription) {
            $endsAt = $this->calculateEndsAt($subscription->plan, $startsAt);

            $subscription->update([
                'status' => SubscriptionStatus::Active,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
            ]);

            if ($subscription->student) {
                $this->notificationService->notifyStudentGuardian($subscription->student, 'subscription_activated', [
                    'plan_name' => $subscription->plan?->name ?? '',
                ]);
            }
        }
    }

    private function activateOrders(Invoice $invoice): void
    {
        Order::query()
            ->where('invoice_id', $invoice->id)
            ->where('status', OrderStatus::PendingPayment)
            ->update(['status' => OrderStatus::Processing]);
    }

    private function activatePrivateLessonBookings(Invoice $invoice): void
    {
        PrivateLessonBooking::query()
            ->where('invoice_id', $invoice->id)
            ->where('status', PrivateLessonBookingStatus::PendingPayment)
            ->update(['status' => PrivateLessonBookingStatus::Confirmed]);
    }

    private function calculateEndsAt(Plan $plan, Carbon $startsAt): ?Carbon
    {
        if ($plan->duration_type === PlanDurationType::FixedPeriod) {
            $plan->loadMissing('durationPeriod');

            return $plan->durationPeriod?->end_date?->copy()->startOfDay();
        }

        return null;
    }
}
