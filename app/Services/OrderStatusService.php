<?php

namespace App\Services;

use App\Enums\FulfillmentType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class OrderStatusService
{
    /**
     * @return LengthAwarePaginator<int, Order>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Order::class)
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('student_id'),
                AllowedFilter::exact('fulfillment_type'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('student'),
                AllowedInclude::relationship('items'),
                AllowedInclude::relationship('invoice'),
                AllowedInclude::relationship('deliveryZone'),
                AllowedInclude::relationship('branch'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    public function updateStatus(Order $order, OrderStatus $newStatus): Order
    {
        if ($order->status === $newStatus) {
            return $order->refresh()->load(['items', 'student', 'invoice', 'deliveryZone', 'branch']);
        }

        if (! $this->isTransitionAllowed($order, $newStatus)) {
            throw ValidationException::withMessages([
                'status' => ['انتقال الحالة غير مسموح.'],
            ]);
        }

        return DB::transaction(function () use ($order, $newStatus) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($newStatus === OrderStatus::Cancelled) {
                $this->restoreStock($order);
            }

            $order->update(['status' => $newStatus]);

            return $order->refresh()->load(['items', 'student', 'invoice', 'deliveryZone', 'branch']);
        });
    }

    private function isTransitionAllowed(Order $order, OrderStatus $newStatus): bool
    {
        $current = $order->status;

        if ($newStatus === OrderStatus::Cancelled) {
            return in_array($current, [OrderStatus::PendingPayment, OrderStatus::Processing], true);
        }

        if ($current === OrderStatus::Processing) {
            if ($order->fulfillment_type === FulfillmentType::Pickup) {
                return $newStatus === OrderStatus::ReadyForPickup;
            }

            if ($order->fulfillment_type === FulfillmentType::Delivery) {
                return $newStatus === OrderStatus::OutForDelivery;
            }
        }

        if ($current === OrderStatus::ReadyForPickup && $newStatus === OrderStatus::Delivered) {
            return $order->fulfillment_type === FulfillmentType::Pickup;
        }

        if ($current === OrderStatus::OutForDelivery && $newStatus === OrderStatus::Delivered) {
            return $order->fulfillment_type === FulfillmentType::Delivery;
        }

        return false;
    }

    private function restoreStock(Order $order): void
    {
        $order->loadMissing('items');

        foreach ($order->items as $item) {
            Product::query()
                ->whereKey($item->product_id)
                ->lockForUpdate()
                ->increment('stock_quantity', $item->quantity);
        }
    }
}
