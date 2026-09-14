<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subject\StoreSubjectRequest;
use App\Http\Requests\Subject\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\Subject;
use App\Services\SubjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubjectController extends Controller
{
    public function __construct(
        private readonly SubjectService $subjectService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return SubjectResource::collection($this->subjectService->list($request));
    }

    public function store(StoreSubjectRequest $request): JsonResponse
    {
        $subject = $this->subjectService->create($request->validated());

        return (new SubjectResource($subject))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Subject $subject): SubjectResource
    {
        return new SubjectResource($subject);
    }

    public function update(UpdateSubjectRequest $request, Subject $subject): SubjectResource
    {
        return new SubjectResource($this->subjectService->update($subject, $request->validated()));
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $this->subjectService->delete($subject);

        return response()->json(['message' => 'Subject deleted successfully.']);
    }
}
