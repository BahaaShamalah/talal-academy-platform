<?php

namespace Database\Seeders;

use App\Enums\PaymentMethod;
use App\Models\Plan;
use App\Models\Student;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Database\Seeder;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

        $plan = Plan::query()->orderBy('id')->first();

        if (! $plan) {
            return;
        }

        /** @var SubscriptionService $subscriptionService */
        $subscriptionService = app(SubscriptionService::class);

        foreach (['أحمد محمد', 'سارة محمد'] as $studentName) {
            $student = Student::query()->where('full_name', $studentName)->first();

            if (! $student) {
                continue;
            }

            $result = $subscriptionService->subscribeStudentToPlan($student, $plan, $admin);
            $subscriptionService->markInvoicePaid($result['invoice'], PaymentMethod::Cash);
        }
    }
}
