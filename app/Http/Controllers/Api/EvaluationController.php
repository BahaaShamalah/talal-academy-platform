<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Evaluation\StoreEvaluationRequest;
use App\Http\Requests\Evaluation\UpdateEvaluationRequest;
use App\Http\Resources\EvaluationResource;
use App\Models\Evaluation;
use App\Models\Student;
use App\Services\EvaluationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EvaluationController extends Controller
{
    public function __construct(
        private readonly EvaluationService $evaluationService,
    ) {}

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        return EvaluationResource::collection(
            $this->evaluationService
                ->listForStudent($student, $request, $request->user())
                ->loadMissing(['classOffering.subject', 'creator']),
        );
    }

    public function store(StoreEvaluationRequest $request, Student $student): JsonResponse
    {
        $evaluation = $this->evaluationService->create(
            $student,
            $request->validated(),
            $request->user(),
        );

        return (new EvaluationResource($evaluation->load(['classOffering.subject', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateEvaluationRequest $request, Evaluation $evaluation): EvaluationResource
    {
        $this->evaluationService->assertCanModify($request->user(), $evaluation);

        return new EvaluationResource(
            $this->evaluationService
                ->update($evaluation, $request->validated(), $request->user())
                ->load(['classOffering.subject', 'creator']),
        );
    }

    public function destroy(Request $request, Evaluation $evaluation): JsonResponse
    {
        $this->evaluationService->assertCanModify($request->user(), $evaluation);
        $this->evaluationService->delete($evaluation, $request->user());

        return response()->json(null, 204);
    }
}
