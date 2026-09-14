<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exam\StoreExamRequest;
use App\Http\Requests\Exam\StoreExamResultsRequest;
use App\Http\Resources\ExamResource;
use App\Http\Resources\ExamResultResource;
use App\Models\Exam;
use App\Services\ExamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExamController extends Controller
{
    public function __construct(
        private readonly ExamService $examService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ExamResource::collection(
            $this->examService
                ->list($request, $request->user())
                ->loadMissing(['classOffering.subject', 'classOffering.grade', 'period', 'creator']),
        );
    }

    public function store(StoreExamRequest $request): JsonResponse
    {
        $exam = $this->examService->create(
            $request->validated(),
            $request->user(),
        );

        return (new ExamResource($exam->load(['classOffering.subject', 'period', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    public function results(Request $request, Exam $exam): JsonResponse
    {
        $exam->loadMissing(['classOffering.subject', 'classOffering.grade', 'period']);
        $roster = $this->examService->getResultsRoster($exam, $request->user());

        return response()->json([
            'exam' => new ExamResource($exam),
            'roster' => $roster->map(fn (array $row) => [
                'student' => [
                    'id' => $row['student']->id,
                    'full_name' => $row['student']->full_name,
                    'file_number' => $row['student']->file_number,
                ],
                'enrollment_id' => $row['enrollment']->id,
                'result' => $row['result']
                    ? new ExamResultResource($row['result'])
                    : null,
            ]),
        ]);
    }

    public function storeResults(StoreExamResultsRequest $request, Exam $exam): JsonResponse
    {
        $saved = $this->examService->recordResults(
            $exam,
            $request->validated('results'),
            $request->user(),
        );

        $exam->loadMissing(['classOffering.subject', 'period']);

        return response()->json([
            'exam' => new ExamResource($exam),
            'results' => ExamResultResource::collection($saved),
        ]);
    }
}
