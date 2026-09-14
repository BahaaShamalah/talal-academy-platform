<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Plan\StorePlanRequest;
use App\Http\Requests\Plan\UpdatePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PlanController extends Controller
{
    public function __construct(
        private readonly PlanService $planService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PlanResource::collection($this->planService->list($request));
    }

    public function store(StorePlanRequest $request): JsonResponse
    {
        $plan = $this->planService->create($request->validated());

        return (new PlanResource($plan->load(['grade', 'subject', 'period', 'durationPeriod', 'productType'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Plan $plan): PlanResource
    {
        return new PlanResource($plan->load(['grade', 'subject', 'period', 'durationPeriod', 'productType']));
    }

    public function update(UpdatePlanRequest $request, Plan $plan): PlanResource
    {
        return new PlanResource(
            $this->planService->update($plan, $request->validated())
                ->load(['grade', 'subject', 'period', 'durationPeriod', 'productType'])
        );
    }

    public function destroy(Plan $plan): JsonResponse
    {
        $this->planService->delete($plan);

        return response()->json(['message' => 'Plan deleted successfully.']);
    }
}
