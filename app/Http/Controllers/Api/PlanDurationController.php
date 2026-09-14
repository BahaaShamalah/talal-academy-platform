<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlanDuration\StorePlanDurationRequest;
use App\Http\Requests\PlanDuration\UpdatePlanDurationRequest;
use App\Http\Resources\PlanDurationResource;
use App\Models\PlanDuration;
use App\Services\PlanDurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PlanDurationController extends Controller
{
    public function __construct(
        private readonly PlanDurationService $planDurationService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PlanDurationResource::collection($this->planDurationService->list($request));
    }

    public function store(StorePlanDurationRequest $request): JsonResponse
    {
        $duration = $this->planDurationService->create($request->validated());

        return (new PlanDurationResource($duration))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PlanDuration $planDuration): PlanDurationResource
    {
        return new PlanDurationResource($planDuration);
    }

    public function update(UpdatePlanDurationRequest $request, PlanDuration $planDuration): PlanDurationResource
    {
        return new PlanDurationResource(
            $this->planDurationService->update($planDuration, $request->validated())
        );
    }

    public function destroy(PlanDuration $planDuration): JsonResponse
    {
        $this->planDurationService->delete($planDuration);

        return response()->json(['message' => 'Plan duration deleted successfully.']);
    }
}
