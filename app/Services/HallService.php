<?php

namespace App\Services;

use App\Models\Hall;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class HallService
{
    /**
     * @return LengthAwarePaginator<int, Hall>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Hall::class)
            ->allowedFilters(
                AllowedFilter::exact('branch_id'),
            )
            ->with('branch')
            ->defaultSort('order')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Hall
    {
        return Hall::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Hall $hall, array $data): Hall
    {
        $hall->update($data);

        return $hall->refresh();
    }

    public function delete(Hall $hall): void
    {
        if ($hall->classOfferings()->exists()) {
            throw ValidationException::withMessages([
                'hall' => ['لا يمكن حذف قاعة مرتبطة بعروض مواد. احذف العروض أولاً.'],
            ]);
        }

        $hall->delete();
    }
}
