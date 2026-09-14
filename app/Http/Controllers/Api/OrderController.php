<?php

namespace App\Http\Controllers\Api;

use App\Enums\FulfillmentType;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Student;
use App\Services\OrderService;
use App\Services\OrderStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly OrderStatusService $orderStatusService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection($this->orderStatusService->list($request));
    }

    public function store(StoreOrderRequest $request, Student $student): JsonResponse
    {
        $validated = $request->validated();

        $order = $this->orderService->createOrder(
            $student,
            $validated['items'],
            FulfillmentType::from($validated['fulfillment_type']),
            $request->user(),
            $validated['delivery_zone_id'] ?? null,
            $validated['delivery_address'] ?? null,
            $validated['branch_id'] ?? null,
        );

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource(
            $order->load(['student', 'items', 'invoice.items', 'deliveryZone', 'branch'])
        );
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): OrderResource
    {
        return new OrderResource(
            $this->orderStatusService->updateStatus(
                $order,
                OrderStatus::from($request->validated('status')),
            )
        );
    }
}
