<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RoleService
{
    /**
     * @return array<string, list<string>>
     */
    public function permissionsGrouped(): array
    {
        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name');

        /** @var array<string, list<string>> $grouped */
        $grouped = [];

        foreach ($permissions as $name) {
            $module = str_contains($name, '.')
                ? explode('.', $name, 2)[0]
                : $name;
            $grouped[$module][] = $name;
        }

        ksort($grouped);

        return $grouped;
    }

    /**
     * @return Collection<int, Role>
     */
    public function list(): Collection
    {
        // Avoid Role::users() withCount — Spatie morphedByMany can fail during count
        // subquery resolution ("Class name must be a valid object or a string").
        $roles = Role::query()
            ->where('guard_name', 'web')
            ->withCount(['permissions'])
            ->orderBy('name')
            ->get();

        $userCounts = DB::table('model_has_roles')
            ->selectRaw('role_id, COUNT(*) as aggregate')
            ->whereIn('role_id', $roles->pluck('id'))
            ->groupBy('role_id')
            ->pluck('aggregate', 'role_id');

        foreach ($roles as $role) {
            $role->setAttribute('users_count', (int) ($userCounts[$role->id] ?? 0));
        }

        return $roles;
    }

    public function find(Role $role): Role
    {
        $role->load('permissions')->loadCount(['permissions']);
        $role->setAttribute(
            'users_count',
            (int) DB::table('model_has_roles')->where('role_id', $role->id)->count(),
        );

        return $role;
    }

    /**
     * @param  array{name: string, permissions?: list<string>}  $data
     */
    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data) {
            $role = Role::create([
                'name' => $data['name'],
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($data['permissions'] ?? []);

            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            return $role->load('permissions')->loadCount(['users', 'permissions']);
        });
    }

    /**
     * @param  array{name?: string, permissions?: list<string>}  $data
     */
    public function update(Role $role, array $data): Role
    {
        $oldPermissions = $role->permissions()->pluck('name')->sort()->values()->all();

        $updated = DB::transaction(function () use ($role, $data) {
            if (array_key_exists('permissions', $data)) {
                $this->guardAdminPermissions($role, $data['permissions']);
                $role->syncPermissions($data['permissions']);
            }

            if (array_key_exists('name', $data) && $data['name'] !== $role->name) {
                $role->name = $data['name'];
                $role->save();
            }

            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            return $role->fresh(['permissions'])->loadCount(['users', 'permissions']);
        });

        if (array_key_exists('permissions', $data)) {
            $newPermissions = collect($data['permissions'])->sort()->values()->all();
            AuditLogService::log(
                'role.permissions_updated',
                $updated,
                sprintf(
                    'حدّث صلاحيات الدور «%s» (%d → %d صلاحية)',
                    $updated->name,
                    count($oldPermissions),
                    count($newPermissions),
                ),
                ['permissions' => $oldPermissions],
                ['permissions' => $newPermissions],
                auth()->user(),
            );
        }

        return $updated;
    }

    public function delete(Role $role): void
    {
        if ($role->name === 'admin') {
            throw new HttpException(403, 'لا يمكن حذف دور المسؤول الأساسي');
        }

        $usersCount = $role->users()->count();
        if ($usersCount > 0) {
            throw new ConflictHttpException(
                "لا يمكن حذف دور مرتبط بـ{$usersCount} مستخدم، انقلهم لدور آخر أولًا"
            );
        }

        $roleName = $role->name;

        AuditLogService::log(
            'role.deleted',
            $role,
            sprintf('حذف الدور «%s»', $roleName),
            ['name' => $roleName],
            null,
            auth()->user(),
        );

        $role->delete();
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * @param  list<string>  $permissions
     */
    private function guardAdminPermissions(Role $role, array $permissions): void
    {
        if ($role->name !== 'admin') {
            return;
        }

        if (count($permissions) === 0) {
            throw ValidationException::withMessages([
                'permissions' => ['لا يمكن إزالة كل صلاحيات دور المسؤول الأساسي.'],
            ]);
        }
    }
}
