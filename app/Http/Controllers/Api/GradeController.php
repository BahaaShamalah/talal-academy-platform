<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Grade\StoreGradeRequest;
use App\Http\Requests\Grade\UpdateGradeRequest;
use App\Http\Resources\GradeResource;
use App\Models\Grade;
use App\Models\Subject;
use App\Services\GradeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GradeController extends Controller
{
    public function __construct(
        private readonly GradeService $gradeService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return GradeResource::collection($this->gradeService->list($request));
    }

    public function store(StoreGradeRequest $request): JsonResponse
    {
        $grade = $this->gradeService->create($request->validated());

        return (new GradeResource($grade->load('educationalStage')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Grade $grade): GradeResource
    {
        return new GradeResource($grade->load(['educationalStage', 'subjects']));
    }

    public function update(UpdateGradeRequest $request, Grade $grade): GradeResource
    {
        return new GradeResource(
            $this->gradeService->update($grade, $request->validated())
                ->load('educationalStage')
        );
    }

    public function destroy(Grade $grade): JsonResponse
    {
        $this->gradeService->delete($grade);

        return response()->json(['message' => 'Grade deleted successfully.']);
    }

    public function attachSubject(Grade $grade, Subject $subject): JsonResponse
    {
        $this->gradeService->attachSubject($grade, $subject);

        return (new GradeResource($grade->load(['educationalStage', 'subjects'])))
            ->response()
            ->setStatusCode(200);
    }

    public function detachSubject(Grade $grade, Subject $subject): JsonResponse
    {
        $this->gradeService->detachSubject($grade, $subject);

        return response()->json(['message' => 'Subject detached from grade successfully.']);
    }
}
