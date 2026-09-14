<?php

namespace App\Services;

use App\Models\ProductType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductTypeService
{
    /**
     * @return LengthAwarePaginator<int, ProductType>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(ProductType::class)
            ->allowedFilters(
                AllowedFilter::exact('is_active'),
                AllowedFilter::exact('subject_selection_mode'),
                AllowedFilter::exact('key'),
            )
            ->defaultSort('id')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ProductType
    {
        if (empty($data['key'])) {
            $data['key'] = ProductType::makeUniqueKey($data['name_ar'], $data['name_en'] ?? null);
        }

        return ProductType::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ProductType $productType, array $data): ProductType
    {
        unset($data['key']);

        $productType->update($data);

        return $productType->refresh();
    }

    public function delete(ProductType $productType): void
    {
        if ($productType->plans()->exists()) {
            throw ValidationException::withMessages([
                'product_type' => ['لا يمكن حذف نوع مرتبط بباقات.'],
            ]);
        }

        $productType->delete();
    }
}
