<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\MarkSectionAttendanceRequest;
use App\Services\AttendanceBoardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceBoardController extends Controller
{
    public function __construct(
        private readonly AttendanceBoardService $attendanceBoardService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'educational_stage_id' => ['nullable', 'integer', 'exists:educational_stages,id'],
            'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'grade_section_id' => ['nullable', 'integer', 'exists:grade_sections,id'],
        ]);

        return response()->json(
            $this->attendanceBoardService->board(
                $request->user(),
                $validated['date'],
                isset($validated['educational_stage_id']) ? (int) $validated['educational_stage_id'] : null,
                isset($validated['grade_id']) ? (int) $validated['grade_id'] : null,
                isset($validated['grade_section_id']) ? (int) $validated['grade_section_id'] : null,
            )
        );
    }

    public function mark(MarkSectionAttendanceRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->attendanceBoardService->mark(
                $request->user(),
                $data['date'],
                $data['records'],
                isset($data['grade_section_id']) ? (int) $data['grade_section_id'] : null,
                isset($data['grade_id']) ? (int) $data['grade_id'] : null,
            )
        );
    }
}
