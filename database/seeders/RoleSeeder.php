<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Seed roles and sync their permissions.
     */
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $admin = Role::findOrCreate('admin', 'web');
        $teacher = Role::findOrCreate('teacher', 'web');
        $accountant = Role::findOrCreate('accountant', 'web');
        $student = Role::findOrCreate('student', 'web');

        $admin->syncPermissions(Permission::query()->get());

        $teacher->syncPermissions([
            'grades.view',
            'periods.view',
            'course-groups.view',
            'class-schedules.view',
            'students.view',
            'enrollments.view',
            'sessions.view',
            'attendance.view',
            'attendance.manage',
            'evaluations.view',
            'evaluations.manage',
            'materials.view',
            'materials.manage',
            'exams.view',
            'exams.manage',
            'teacher-portal.view',
            'teacher-portal.classes',
            'teacher-portal.payroll',
            'teacher-portal.leaves',
        ]);

        $accountantExcludedViews = [
            'sessions.view',
            'attendance.view',
            'marketing.view',
            'evaluations.view',
            'materials.view',
            'exams.view',
            'roles.view',
            'support-tickets.view',
            'audit-logs.view',
        ];

        $accountant->syncPermissions([
            ...Permission::query()
                ->where('name', 'like', '%.view')
                ->whereNotIn('name', $accountantExcludedViews)
                ->pluck('name')
                ->all(),
            'invoices.manage',
            'subscriptions.manage',
            'payroll.manage',
            'orders.manage',
        ]);

        $student->syncPermissions([]);
    }
}
