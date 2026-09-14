<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EducationalStage\StoreEducationalStageRequest;
use App\Http\Requests\EducationalStage\UpdateEducationalStageRequest;
use App\Http\Resources\EducationalStageResource;
use App\Models\EducationalStage;
use App\Services\EducationalStageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EducationalStageController extends Controller
{
    public function __construct(
        private readonly EducationalStageService $educationalStageService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return EducationalStageResource::collection($this->educationalStageService->list($request));
    }

    public function store(StoreEducationalStageRequest $request): JsonResponse
    {
        $stage = $this->educationalStageService->create($request->validated());

        return (new EducationalStageResource($stage))
            ->response()
            ->setStatusCode(201);
    }

    public function show(EducationalStage $educationalStage): EducationalStageResource
    {
        return new EducationalStageResource($educationalStage->load('grades'));
    }

    public function update(
        UpdateEducationalStageRequest $request,
        EducationalStage $educationalStage,
    ): EducationalStageResource {
        return new EducationalStageResource(
            $this->educationalStageService->update($educationalStage, $request->validated())
        );
    }

    public function destroy(EducationalStage $educationalStage): JsonResponse
    {
        $this->educationalStageService->delete($educationalStage);

        return response()->json(['message' => 'Educational stage deleted successfully.']);
    }
}
