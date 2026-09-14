<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GradeSection\StoreGradeSectionRequest;
use App\Http\Requests\GradeSection\UpdateGradeSectionRequest;
use App\Http\Resources\GradeSectionResource;
use App\Http\Resources\StudentResource;
use App\Models\GradeSection;
use App\Services\GradeSectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GradeSectionController extends Controller
{
    public function __construct(
        private readonly GradeSectionService $gradeSectionService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return GradeSectionResource::collection($this->gradeSectionService->list($request));
    }

    public function store(StoreGradeSectionRequest $request): JsonResponse
    {
        $section = $this->gradeSectionService->create($request->validated());

        return (new GradeSectionResource($section->load(['grade.educationalStage', 'period'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(GradeSection $gradeSection): GradeSectionResource
    {
        return new GradeSectionResource(
            $gradeSection->load(['grade.educationalStage', 'period'])
                ->loadCount('classOfferings')
        );
    }

    public function students(GradeSection $gradeSection): AnonymousResourceCollection
    {
        return StudentResource::collection(
            $this->gradeSectionService->students($gradeSection)
        );
    }

    public function update(UpdateGradeSectionRequest $request, GradeSection $gradeSection): GradeSectionResource
    {
        return new GradeSectionResource(
            $this->gradeSectionService
                ->update($gradeSection, $request->validated())
                ->load(['grade.educationalStage', 'period'])
        );
    }

    public function destroy(GradeSection $gradeSection): JsonResponse
    {
        $this->gradeSectionService->delete($gradeSection);

        return response()->json(['message' => 'Grade section deleted successfully.']);
    }
}
