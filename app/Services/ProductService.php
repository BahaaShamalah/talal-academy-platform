<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductService
{
    public function __construct(
        private readonly MediaService $mediaService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Product>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Product::class)
            ->with('imageMedia')
            ->allowedFilters(
                AllowedFilter::exact('is_active'),
                AllowedFilter::partial('name'),
            )
            ->defaultSort('name')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Product
    {
        return Product::query()->create($this->normalizePayload($data))->load('imageMedia');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Product $product, array $data): Product
    {
        $oldImageId = $product->image_media_id;
        $product->update($this->normalizePayload($data, $product));
        $product = $product->refresh()->load('imageMedia');

        if (array_key_exists('image_media_id', $data) && $oldImageId && (int) $oldImageId !== (int) $product->image_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldImageId);
        }

        return $product;
    }

    public function delete(Product $product): void
    {
        if ($product->orderItems()->exists()) {
            throw ValidationException::withMessages([
                'product' => ['لا يمكن حذف منتج مرتبط بطلبات.'],
            ]);
        }

        $oldImageId = $product->image_media_id;
        $product->delete();
        $this->mediaService->deleteIfOrphan($oldImageId ? (int) $oldImageId : null);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizePayload(array $data, ?Product $existing = null): array
    {
        $payload = [
            'name' => $data['name'] ?? $existing?->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : ($existing?->description),
            'price' => number_format((float) ($data['price'] ?? $existing?->price ?? 0), 3, '.', ''),
            'stock_quantity' => (int) ($data['stock_quantity'] ?? $existing?->stock_quantity ?? 0),
            'is_active' => $data['is_active'] ?? $existing?->is_active ?? true,
        ];

        if (array_key_exists('image_media_id', $data)) {
            $payload['image_media_id'] = $data['image_media_id'];
        }

        return $payload;
    }
}
