<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::findOrCreate('periods.view', 'web');

        $teacher = Role::query()->where('name', 'teacher')->where('guard_name', 'web')->first();
        if ($teacher && ! $teacher->hasPermissionTo('periods.view')) {
            $teacher->givePermissionTo('periods.view');
        }
    }

    public function down(): void
    {
        // Keep periods.view — removing it would break staff roles.
    }
};
