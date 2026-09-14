<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ScheduleGridService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleGridController extends Controller
{
    public function __construct(
        private readonly ScheduleGridService $scheduleGridService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $gender = $request->query('gender');
        if ($gender !== null && ! in_array($gender, ['male', 'female'], true)) {
            return response()->json([
                'message' => 'قيمة gender يجب أن تكون male أو female.',
            ], 422);
        }

        $grid = $this->scheduleGridService->build([
            'gender' => $gender,
            'period_id' => $request->integer('period_id') ?: null,
            'educational_stage_id' => $request->integer('educational_stage_id') ?: null,
            'grade_id' => $request->integer('grade_id') ?: null,
            'grade_section_id' => $request->query('grade_section_id'),
            'subject_id' => $request->integer('subject_id') ?: null,
        ]);

        return response()->json($grid);
    }
}
