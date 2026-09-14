<?php

namespace Database\Seeders;

use App\Enums\CompensationComponentType;
use App\Models\StaffCompensationComponent;
use App\Models\User;
use App\Services\PayrollService;
use Illuminate\Database\Seeder;

class PayrollSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->first();
        $teacherOne = User::query()->where('email', 'teacher@example.com')->first();

        if (! $admin || ! $teacherOne) {
            return;
        }

        $teacherTwo = User::query()->firstOrCreate(
            ['email' => 'teacher2@example.com'],
            [
                'name' => 'Teacher Fixed',
                'phone' => '0500000002',
                'password' => 'password',
                'is_teaching_staff' => true,
            ],
        );
        $teacherTwo->assignRole('teacher');
        $teacherTwo->forceFill(['is_teaching_staff' => true])->save();

        StaffCompensationComponent::query()->updateOrCreate(
            [
                'user_id' => $teacherOne->id,
                'component_type' => CompensationComponentType::PerSessionRate,
                'effective_from' => now()->startOfMonth()->toDateString(),
            ],
            [
                'amount' => 15.000,
                'is_active' => true,
                'effective_to' => null,
            ],
        );

        StaffCompensationComponent::query()->updateOrCreate(
            [
                'user_id' => $teacherTwo->id,
                'component_type' => CompensationComponentType::BaseSalary,
                'effective_from' => now()->startOfMonth()->toDateString(),
            ],
            [
                'amount' => 450.000,
                'is_active' => true,
                'effective_to' => null,
            ],
        );

        /** @var PayrollService $payroll */
        $payroll = app(PayrollService::class);
        $payroll->generateRun(now()->toDateString(), $admin->id);
    }
}
