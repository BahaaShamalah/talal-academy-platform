<?php

namespace App\Services;

use App\Models\StaffCompensationComponent;
use App\Models\User;
use Illuminate\Support\Collection;

class CompensationComponentService
{
    /**
     * @return Collection<int, StaffCompensationComponent>
     */
    public function listActive(User $user): Collection
    {
        return StaffCompensationComponent::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where(function ($q): void {
                $q->whereNull('effective_to')
                    ->orWhereDate('effective_to', '>=', now()->toDateString());
            })
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @return Collection<int, StaffCompensationComponent>
     */
    public function history(User $user): Collection
    {
        return StaffCompensationComponent::query()
            ->where('user_id', $user->id)
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): StaffCompensationComponent
    {
        return StaffCompensationComponent::query()->create([
            ...$data,
            'user_id' => $user->id,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(StaffCompensationComponent $component, array $data): StaffCompensationComponent
    {
        $component->update($data);

        return $component->refresh();
    }

    public function delete(StaffCompensationComponent $component): void
    {
        $component->delete();
    }

    public function assertOwns(User $user, StaffCompensationComponent $component): void
    {
        if ((int) $component->user_id !== (int) $user->id) {
            abort(404);
        }
    }
}
