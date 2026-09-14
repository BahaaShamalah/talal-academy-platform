<?php

namespace App\Services;

use App\Models\Guardian;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class GuardianService
{
    /**
     * @return LengthAwarePaginator<int, Guardian>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Guardian::class)
            ->allowedFilters(
                AllowedFilter::partial('full_name'),
                AllowedFilter::exact('phone'),
                AllowedFilter::exact('civil_id'),
            )
            ->withCount('students')
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Guardian
    {
        return Guardian::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Guardian $guardian, array $data): Guardian
    {
        $guardian->update($data);

        return $guardian->refresh();
    }

    public function delete(Guardian $guardian): void
    {
        if ($guardian->students()->exists()) {
            throw ValidationException::withMessages([
                'guardian' => ['لا يمكن حذف ولي أمر مرتبط بطلاب.'],
            ]);
        }

        $guardian->delete();
    }
}
