<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    private array $modules = [
        'branches',
        'halls',
        'subjects',
        'stages',
        'grades',
        'periods',
        'product-types',
        'plans',
        'durations',
        'course-groups',
        'class-schedules',
        'users',
        'students',
        'guardians',
        'enrollments',
        'invoices',
        'subscriptions',
        'coupons',
        'sessions',
        'attendance',
        'payroll',
        'teachers',
        'products',
        'delivery-zones',
        'orders',
        'private-lessons',
        'installments',
        'family-discounts',
        'reports',
        'evaluations',
        'materials',
        'exams',
        'roles',
        'staff-attendance',
        'leaves',
        'support-tickets',
    ];

    /**
     * @var list<string>
     */
    private array $actions = [
        'view',
        'manage',
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach ($this->modules as $module) {
            foreach ($this->actions as $action) {
                Permission::findOrCreate("{$module}.{$action}", 'web');
            }
        }

        Permission::findOrCreate('settings.manage', 'web');
        Permission::findOrCreate('notifications.manage', 'web');
        Permission::findOrCreate('audit-logs.view', 'web');
        Permission::findOrCreate('analytics.view', 'web');
        Permission::findOrCreate('marketing.view', 'web');
        Permission::findOrCreate('marketing.manage', 'web');
        Permission::findOrCreate('evaluations.manage-any', 'web');

        // بوابة المعلم — تُتحكم من الأدوار والصلاحيات
        Permission::findOrCreate('teacher-portal.view', 'web');
        Permission::findOrCreate('teacher-portal.classes', 'web');
        Permission::findOrCreate('teacher-portal.payroll', 'web');
        Permission::findOrCreate('teacher-portal.leaves', 'web');

        // إعداد عدد أيام تنبيه الغياب — للإدارة وليس للمعلم
        Permission::findOrCreate('absence-alerts.manage', 'web');
    }
}
