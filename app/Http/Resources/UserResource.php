<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_teaching_staff' => (bool) $this->is_teaching_staff,
            'has_all_branch_access' => (bool) $this->has_all_branch_access,
            'branches' => app(UserService::class)->resolvedBranches($this->resource),
            'roles' => $this->getRoleNames()->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'taught_class_offerings_count' => $this->when(
                isset($this->taught_class_offerings_count),
                fn () => (int) $this->taught_class_offerings_count
            ),
            'compensation_components' => $this->when(
                $this->relationLoaded('compensationComponents'),
                fn () => StaffCompensationComponentResource::collection($this->compensationComponents)->resolve()
            ),
            'staff_profile' => $this->when(
                $this->relationLoaded('staffProfile'),
                fn () => $this->staffProfile
                    ? (new StaffProfileResource($this->staffProfile))->resolve()
                    : null
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
