<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AbsenceAlertThreshold\StoreAbsenceAlertThresholdRequest;
use App\Http\Requests\AbsenceAlertThreshold\UpdateAbsenceAlertThresholdRequest;
use App\Http\Resources\AbsenceAlertThresholdResource;
use App\Models\AbsenceAlertThreshold;
use App\Services\AbsenceAlertThresholdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AbsenceAlertThresholdController extends Controller
{
    public function __construct(
        private readonly AbsenceAlertThresholdService $thresholdService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return AbsenceAlertThresholdResource::collection($this->thresholdService->list($request));
    }

    public function store(StoreAbsenceAlertThresholdRequest $request): JsonResponse
    {
        $threshold = $this->thresholdService->create($request->validated());

        return (new AbsenceAlertThresholdResource($threshold))
            ->response()
            ->setStatusCode(201);
    }

    public function show(AbsenceAlertThreshold $absenceAlertThreshold): AbsenceAlertThresholdResource
    {
        return new AbsenceAlertThresholdResource($absenceAlertThreshold);
    }

    public function update(
        UpdateAbsenceAlertThresholdRequest $request,
        AbsenceAlertThreshold $absenceAlertThreshold,
    ): AbsenceAlertThresholdResource {
        return new AbsenceAlertThresholdResource(
            $this->thresholdService->update($absenceAlertThreshold, $request->validated()),
        );
    }

    public function destroy(AbsenceAlertThreshold $absenceAlertThreshold): JsonResponse
    {
        $this->thresholdService->delete($absenceAlertThreshold);

        return response()->json(null, 204);
    }
}
