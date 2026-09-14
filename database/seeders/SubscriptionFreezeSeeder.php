<?php

namespace Database\Seeders;

use App\Enums\PaymentMethod;
use App\Models\Plan;
use App\Models\Student;
use App\Models\User;
use App\Services\FreezeService;
use App\Services\InstallmentService;
use App\Services\SubscriptionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class SubscriptionFreezeSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $plan = Plan::query()->orderBy('id')->firstOrFail();
        $khalid = Student::query()->where('full_name', 'خالد يوسف')->firstOrFail();

        if (! $plan->installment_template_id) {
            return;
        }

        /** @var SubscriptionService $subscriptionService */
        $subscriptionService = app(SubscriptionService::class);
        /** @var InstallmentService $installmentService */
        $installmentService = app(InstallmentService::class);
        /** @var FreezeService $freezeService */
        $freezeService = app(FreezeService::class);

        $result = $subscriptionService->subscribeStudentToPlan(
            $khalid,
            $plan,
            $admin,
            paymentMode: 'installment',
        );

        $invoice = $result['invoice']->load('installments');
        $firstInstallment = $invoice->installments->sortBy('sequence')->first();
        $secondInstallment = $invoice->installments->sortBy('sequence')->skip(1)->first();

        if (! $firstInstallment || ! $secondInstallment) {
            return;
        }

        $installmentService->payInstallment($firstInstallment, PaymentMethod::Cash);

        $startDate = Carbon::today();
        $endDate = $startDate->copy()->addDays(14);
        $originalDueDate = $startDate->copy()->addDays(5);
        $secondInstallment->update(['due_date' => $originalDueDate->toDateString()]);

        $subscription = $result['subscription']->fresh();

        $freezeService->createFreeze(
            subscription: $subscription,
            startDate: $startDate,
            endDate: $endDate,
            reason: 'تجميد تجريبي — إجازة مؤقتة',
            pausesInstallments: true,
            pausesAttendance: true,
            extendsSubscription: false,
            createdBy: $admin,
        );

        $secondInstallment->refresh();
        $expectedDueDate = $originalDueDate->copy()->addDays(14)->toDateString();

        if ($secondInstallment->due_date->toDateString() !== $expectedDueDate) {
            throw new \RuntimeException(
                'Seeder check failed: due_date expected '.$expectedDueDate.' got '.$secondInstallment->due_date->toDateString()
            );
        }

        if ($subscription->fresh()->status->value !== 'frozen') {
            throw new \RuntimeException('Seeder check failed: subscription status should be frozen');
        }
    }
}
