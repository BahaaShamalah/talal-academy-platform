<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class UserService
{
    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(User::class)
            ->allowedFilters(
                'name',
                'email',
                AllowedFilter::callback('role', function ($query, $value): void {
                    $query->whereHas('roles', fn ($q) => $q->where('name', $value));
                }),
                AllowedFilter::exact('is_teaching_staff'),
            )
            ->allowedSorts('created_at', 'name')
            ->defaultSort('-created_at')
            ->with([
                'roles',
                'permissions',
                'compensationComponents',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])
            ->withCount('taughtClassOfferings')
            ->paginate($request->integer('per_page', 100))
            ->appends($request->query());
    }

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function listTeachers(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(User::class)
            ->where('is_teaching_staff', true)
            ->allowedFilters(
                'name',
                'email',
                AllowedFilter::callback('subject_id', function ($query, $value): void {
                    $query->whereHas(
                        'staffProfile.subjects',
                        fn ($q) => $q->where('subjects.id', (int) $value),
                    );
                }),
            )
            ->allowedSorts('created_at', 'name')
            ->defaultSort('name')
            ->with([
                'roles',
                'compensationComponents',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])
            ->withCount('taughtClassOfferings')
            ->paginate($request->integer('per_page', 100))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $roles = $data['roles'] ?? [];
            unset($data['roles']);

            $user = User::query()->create($data);
            $user->syncRoles($roles);

            return $user->load(['roles', 'permissions', 'branches', 'staffProfile.subjects', 'staffProfile.grades', 'staffProfile.documents.media'])->loadCount('taughtClassOfferings');
        });
    }

    /**
     * إنشاء مستخدم بدور معلم ويظهر في قوائم المعلمين.
     *
     * @param  array{name: string, email: string, phone?: string|null, password: string, subject_ids: list<int>}  $data
     */
    public function createTeacher(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = $this->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'is_teaching_staff' => true,
                'roles' => ['teacher'],
            ]);

            app(StaffProfileService::class)->syncQualifications(
                $user,
                array_map('intval', $data['subject_ids'] ?? []),
                [],
            );

            return $user->load([
                'roles',
                'permissions',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings');
        });
    }

    /**
     * @param  array{name?: string, email?: string, phone?: string|null, password?: string|null, subject_ids?: list<int>}  $data
     */
    public function updateTeacher(User $user, array $data): User
    {
        if (! $user->is_teaching_staff) {
            throw ValidationException::withMessages([
                'user' => ['المستخدم ليس معلمًا.'],
            ]);
        }

        return DB::transaction(function () use ($user, $data) {
            $subjectIds = $data['subject_ids'] ?? null;
            unset($data['subject_ids']);

            $payload = array_merge($data, [
                'is_teaching_staff' => true,
                'roles' => ['teacher'],
            ]);

            $user = $this->update($user, $payload);

            if (is_array($subjectIds)) {
                app(StaffProfileService::class)->syncQualifications(
                    $user,
                    array_map('intval', $subjectIds),
                    [],
                );
            }

            return $user->load([
                'roles',
                'permissions',
                'branches',
                'compensationComponents',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings');
        });
    }

    public function deleteTeacher(User $user, ?User $actor = null): void
    {
        if (! $user->is_teaching_staff) {
            throw ValidationException::withMessages([
                'user' => ['المستخدم ليس معلمًا.'],
            ]);
        }

        $this->delete($user, $actor);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $roles = $data['roles'] ?? null;
            unset($data['roles']);

            if (array_key_exists('password', $data) && blank($data['password'])) {
                unset($data['password']);
            }

            if (is_array($roles)) {
                $this->guardLastRolesManagerChange($user, $roles);
            }

            $user->update($data);

            if (is_array($roles)) {
                $user->syncRoles($roles);
            }

            return $user->fresh([
                'roles',
                'permissions',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings');
        });
    }

    /**
     * @param  list<string>  $roles
     */
    public function syncRoles(User $user, array $roles): User
    {
        return DB::transaction(function () use ($user, $roles) {
            $this->guardLastRolesManagerChange($user, $roles);
            $user->syncRoles($roles);

            return $user->fresh([
                'roles',
                'permissions',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings');
        });
    }

    /**
     * @return array{has_all_branch_access: bool, branches: list<array{id: int, name: string}>}
     */
    public function getBranches(User $user): array
    {
        return [
            'has_all_branch_access' => (bool) $user->has_all_branch_access,
            'branches' => $this->resolvedBranches($user),
        ];
    }

    /**
     * @param  list<int>  $branchIds
     */
    public function syncBranches(User $user, bool $hasAllBranchAccess, array $branchIds = []): User
    {
        return DB::transaction(function () use ($user, $hasAllBranchAccess, $branchIds) {
            $user->has_all_branch_access = $hasAllBranchAccess;
            $user->save();

            if ($hasAllBranchAccess) {
                $user->branches()->detach();
            } else {
                $user->branches()->sync($branchIds);
            }

            return $user->fresh([
                'roles',
                'permissions',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings');
        });
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function resolvedBranches(User $user): array
    {
        if ($user->has_all_branch_access) {
            return Branch::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Branch $branch) => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                ])
                ->values()
                ->all();
        }

        $branches = $user->relationLoaded('branches')
            ? $user->branches
            : $user->branches()->get(['branches.id', 'branches.name']);

        return $branches
            ->map(fn (Branch $branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
            ])
            ->values()
            ->all();
    }

    public function delete(User $user, ?User $actor = null): void
    {
        if ($actor && $actor->is($user)) {
            throw ValidationException::withMessages([
                'user' => ['لا يمكنك حذف حسابك الحالي.'],
            ]);
        }

        if ($user->can('roles.manage') && $this->rolesManagersCount() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['لا يمكن حذف آخر مستخدم يملك صلاحية إدارة الأدوار.'],
            ]);
        }

        if ($user->taughtClassOfferings()->exists()) {
            throw ValidationException::withMessages([
                'user' => ['لا يمكن حذف مستخدم مرتبط بشعب دراسية.'],
            ]);
        }

        $user->delete();
    }

    /**
     * @param  list<string>  $roles
     */
    private function guardLastRolesManagerChange(User $user, array $roles): void
    {
        if (! $user->can('roles.manage')) {
            return;
        }

        if ($this->rolesGrantPermission($roles, 'roles.manage')) {
            return;
        }

        if ($this->rolesManagersCount() <= 1) {
            throw ValidationException::withMessages([
                'roles' => ['لا يمكن إزالة صلاحية إدارة الأدوار عن آخر مستخدم يملكها.'],
            ]);
        }
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function rolesGrantPermission(array $roleNames, string $permission): bool
    {
        if ($roleNames === []) {
            return false;
        }

        return Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $roleNames)
            ->get()
            ->contains(fn (Role $role) => $role->hasPermissionTo($permission));
    }

    private function rolesManagersCount(): int
    {
        return User::permission('roles.manage')->count();
    }
}
