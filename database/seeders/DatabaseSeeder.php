<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            ProductTypeSeeder::class,
        ]);

        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'phone' => '0500000000',
            'password' => 'password',
        ]);

        $admin->assignRole('admin');

        $this->call([
            AcademicStructureSeeder::class,
            InstallmentSeeder::class,
            FamilyDiscountRuleSeeder::class,
            StudentEnrollmentSeeder::class,
            InstituteSettingSeeder::class,
            CouponSeeder::class,
            SubscriptionSeeder::class,
            AbsenceAlertThresholdSeeder::class,
            NotificationTemplateSeeder::class,
            AttendanceSessionSeeder::class,
            AbsenceAlertSeeder::class,
            EvaluationSeeder::class,
            EducationalMaterialSeeder::class,
            ExamSeeder::class,
            SubscriptionFreezeSeeder::class,
            PayrollSeeder::class,
            StoreSeeder::class,
            MarketingSectionSeeder::class,
            CatalogProgramsPricingSeeder::class,
            PrivateLessonSeeder::class,
            LeaveTypeSeeder::class,
            SupportTicketSeeder::class,
        ]);
    }
}
