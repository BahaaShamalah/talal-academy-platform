<?php

namespace App\Services;

use App\Models\DeliveryZone;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class DeliveryZoneService
{
    /**
     * @return LengthAwarePaginator<int, DeliveryZone>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(DeliveryZone::class)
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
    public function create(array $data): DeliveryZone
    {
        return DeliveryZone::query()->create($this->normalizePayload($data));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(DeliveryZone $deliveryZone, array $data): DeliveryZone
    {
        $deliveryZone->update($this->normalizePayload($data));

        return $deliveryZone->refresh();
    }

    public function delete(DeliveryZone $deliveryZone): void
    {
        if ($deliveryZone->orders()->exists()) {
            throw ValidationException::withMessages([
                'delivery_zone' => ['لا يمكن حذف منطقة مرتبطة بطلبات.'],
            ]);
        }

        $deliveryZone->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizePayload(array $data): array
    {
        return [
            'name' => $data['name'],
            'fee' => number_format((float) $data['fee'], 3, '.', ''),
            'is_active' => $data['is_active'] ?? true,
        ];
    }
}
