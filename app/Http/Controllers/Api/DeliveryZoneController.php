<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeliveryZone\StoreDeliveryZoneRequest;
use App\Http\Requests\DeliveryZone\UpdateDeliveryZoneRequest;
use App\Http\Resources\DeliveryZoneResource;
use App\Models\DeliveryZone;
use App\Services\DeliveryZoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DeliveryZoneController extends Controller
{
    public function __construct(
        private readonly DeliveryZoneService $deliveryZoneService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return DeliveryZoneResource::collection($this->deliveryZoneService->list($request));
    }

    public function store(StoreDeliveryZoneRequest $request): JsonResponse
    {
        $zone = $this->deliveryZoneService->create($request->validated());

        return (new DeliveryZoneResource($zone))
            ->response()
            ->setStatusCode(201);
    }

    public function show(DeliveryZone $deliveryZone): DeliveryZoneResource
    {
        return new DeliveryZoneResource($deliveryZone);
    }

    public function update(UpdateDeliveryZoneRequest $request, DeliveryZone $deliveryZone): DeliveryZoneResource
    {
        return new DeliveryZoneResource(
            $this->deliveryZoneService->update($deliveryZone, $request->validated())
        );
    }

    public function destroy(DeliveryZone $deliveryZone): JsonResponse
    {
        $this->deliveryZoneService->delete($deliveryZone);

        return response()->json(['message' => 'Delivery zone deleted successfully.']);
    }
}
