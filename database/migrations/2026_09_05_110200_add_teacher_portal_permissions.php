<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** @var list<string> */
    private array $permissions = [
        'teacher-portal.view',
        'teacher-portal.classes',
        'teacher-portal.payroll',
        'teacher-portal.leaves',
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach ($this->permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $teacher = Role::query()->where('name', 'teacher')->where('guard_name', 'web')->first();
        if ($teacher) {
            $teacher->givePermissionTo($this->permissions);
        }

        $admin = Role::query()->where('name', 'admin')->where('guard_name', 'web')->first();
        if ($admin) {
            $admin->givePermissionTo($this->permissions);
        }
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach ($this->permissions as $name) {
            Permission::query()->where('name', $name)->where('guard_name', 'web')->delete();
        }
    }
};
