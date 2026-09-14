<?php

namespace App\Services;

use App\Models\Branch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BranchService
{
    /**
     * @return LengthAwarePaginator<int, Branch>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return Branch::query()
            ->withCount('halls')
            ->orderByDesc('is_main')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Branch
    {
        $data['country'] = $data['country'] ?? 'الكويت';

        return DB::transaction(function () use ($data) {
            if (! empty($data['is_main'])) {
                Branch::query()->where('is_main', true)->update(['is_main' => false]);
            }

            return Branch::query()->create($data);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Branch $branch, array $data): Branch
    {
        return DB::transaction(function () use ($branch, $data) {
            if (! empty($data['is_main'])) {
                Branch::query()
                    ->where('is_main', true)
                    ->whereKeyNot($branch->id)
                    ->update(['is_main' => false]);
            }

            $branch->update($data);

            return $branch->refresh();
        });
    }

    public function delete(Branch $branch): void
    {
        if ($branch->halls()->exists()) {
            throw ValidationException::withMessages([
                'branch' => ['لا يمكن حذف فرع مرتبط بقاعات. احذف القاعات أولاً.'],
            ]);
        }

        $branch->delete();
    }
}
