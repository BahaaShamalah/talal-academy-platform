<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\MarkAttendanceRequest;
use App\Http\Requests\ClassSession\CancelClassSessionRequest;
use App\Http\Requests\ClassSession\GenerateSessionsRequest;
use App\Http\Requests\ClassSession\StoreMakeupSessionRequest;
use App\Http\Requests\ClassSession\UpdateClassSessionRequest;
use App\Http\Resources\AttendanceRecordResource;
use App\Http\Resources\SessionResource;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use App\Models\Student;
use App\Services\AttendanceService;
use App\Services\AuditLogService;
use App\Services\ClassSessionService;
use App\Services\SessionGeneratorService;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassSessionController extends Controller
{
    public function __construct(
        private readonly SessionGeneratorService $sessionGeneratorService,
        private readonly ClassSessionService $classSessionService,
        private readonly AttendanceService $attendanceService,
        private readonly TeacherScopeService $teacherScopeService,
    ) {}

    public function index(Request $request, ClassOffering $classOffering): AnonymousResourceCollection
    {
        $this->teacherScopeService->assertOwnsClassOffering($request->user(), $classOffering);
        $sessions = $this->classSessionService->listForClassOffering($classOffering, $request);

        $sessions->getCollection()->transform(function (ClassSession $session) {
            $this->attachSessionCounts($session);

            return $session;
        });

        return SessionResource::collection($sessions);
    }

    public function generate(GenerateSessionsRequest $request, ClassOffering $classOffering): JsonResponse
    {
        $this->teacherScopeService->assertOwnsClassOffering($request->user(), $classOffering);
        $result = $this->sessionGeneratorService->generateSessions(
            $classOffering,
            $request->validated('from_date'),
            $request->validated('to_date'),
        );

        $sessions = collect($result['sessions'])->each(function (ClassSession $session) {
            $this->attachSessionCounts($session);
        });

        return response()->json([
            'created' => $result['created'],
            'skipped' => $result['skipped'],
            'sessions' => SessionResource::collection($sessions)->resolve(),
        ]);
    }

    public function update(UpdateClassSessionRequest $request, ClassSession $session): JsonResponse
    {
        $this->teacherScopeService->assertOwnsSession($request->user(), $session);
        $force = $request->boolean('force');
        $result = $this->classSessionService->update(
            $session,
            $request->safe()->only([
                'teacher_id',
                'hall_id',
                'session_date',
                'start_time',
                'end_time',
            ]),
            $force,
        );

        if ($result['blocked']) {
            return response()->json([
                'message' => 'تعارض في جلسة مع جلسة أخرى بنفس التاريخ.',
                'conflicts' => $result['conflicts'],
            ], 409);
        }

        if ($result['conflicts'] !== [] && $force) {
            $this->logSessionOverride($request, $result['session'], $result['conflicts']);
        }

        $this->attachSessionCounts($result['session']);

        return response()->json([
            'data' => (new SessionResource($result['session']))->resolve(),
            'warnings' => $result['conflicts'],
        ]);
    }

    public function cancel(CancelClassSessionRequest $request, ClassSession $session): JsonResponse
    {
        $this->teacherScopeService->assertOwnsSession($request->user(), $session);
        $cancelled = $this->classSessionService->cancel(
            $session,
            $request->validated('reason'),
        );

        $this->attachSessionCounts($cancelled);

        return response()->json([
            'data' => (new SessionResource($cancelled))->resolve(),
        ]);
    }

    public function storeMakeup(StoreMakeupSessionRequest $request, ClassOffering $classOffering): JsonResponse
    {
        $this->teacherScopeService->assertOwnsClassOffering($request->user(), $classOffering);
        $force = $request->boolean('force');
        $result = $this->classSessionService->createMakeup(
            $classOffering,
            $request->safe()->only([
                'session_date',
                'start_time',
                'end_time',
                'teacher_id',
                'hall_id',
                'student_ids',
            ]),
            $force,
        );

        if ($result['blocked']) {
            return response()->json([
                'message' => 'تعارض في جلسة مع جلسة أخرى بنفس التاريخ.',
                'conflicts' => $result['conflicts'],
            ], 409);
        }

        if ($result['conflicts'] !== [] && $force) {
            $this->logSessionOverride($request, $result['session'], $result['conflicts']);
        }

        $this->attachSessionCounts($result['session']);

        return response()->json([
            'data' => (new SessionResource($result['session']))->resolve(),
            'warnings' => $result['conflicts'],
        ], 201);
    }

    public function roster(Request $request, ClassSession $session): JsonResponse
    {
        $roster = $this->attendanceService->getRosterForSession($session, $request->user());

        $this->attachSessionCounts($session);
        $session->enrolled_count = $roster->count();
        $session->marked_count = $roster->filter(fn ($row) => $row['attendance'] !== null
            && $row['attendance']->status !== AttendanceStatus::Pending)->count();

        return response()->json([
            'session' => new SessionResource($session),
            'roster' => $roster->map(fn (array $row) => [
                'student' => [
                    'id' => $row['student']->id,
                    'full_name' => $row['student']->full_name,
                    'file_number' => $row['student']->file_number,
                ],
                'enrollment_id' => $row['enrollment']->id,
                'attendance' => $row['attendance']
                    ? new AttendanceRecordResource($row['attendance'])
                    : null,
            ]),
        ]);
    }

    public function markAttendance(MarkAttendanceRequest $request, ClassSession $session): JsonResponse
    {
        $records = $this->attendanceService->markAttendance(
            $session,
            $request->validated('records'),
            $request->user()?->id,
            $request->user(),
        );

        $session->refresh();
        $this->attachSessionCounts($session);

        return response()->json([
            'session' => new SessionResource($session),
            'records' => AttendanceRecordResource::collection($records),
        ]);
    }

    public function studentSummary(Student $student): JsonResponse
    {
        return response()->json([
            'student_id' => $student->id,
            'summary' => $this->attendanceService->studentAttendanceSummary($student),
        ]);
    }

    private function attachSessionCounts(ClassSession $session): void
    {
        $session->loadMissing(['classOffering.subject', 'classOffering.grade']);
        $session->enrolled_count = $session->classOffering
            ->enrollments()
            ->where('status', EnrollmentStatus::Active)
            ->count();

        $records = $session->attendanceRecords()->get(['status']);
        $marked = $records->filter(fn ($r) => $r->status !== AttendanceStatus::Pending);
        $session->marked_count = $marked->count();
        $session->present_count = $marked
            ->filter(fn ($r) => in_array($r->status, [AttendanceStatus::Present, AttendanceStatus::Late], true))
            ->count();
        $session->absent_count = $marked
            ->filter(fn ($r) => $r->status === AttendanceStatus::Absent)
            ->count();
    }

    /**
     * @param  list<array<string, mixed>>  $conflicts
     */
    private function logSessionOverride(Request $request, ClassSession $session, array $conflicts): void
    {
        AuditLogService::log(
            'schedule.conflict_overridden',
            $session,
            sprintf(
                'تجاوز تعارض جلسة #%d (%d تعارضات)',
                $session->id,
                count($conflicts),
            ),
            null,
            ['conflicts' => $conflicts, 'scope' => 'session'],
            $request->user(),
        );
    }
}
