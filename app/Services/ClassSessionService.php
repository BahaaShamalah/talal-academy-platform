<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\ClassSessionStatus;
use App\Enums\EnrollmentStatus;
use App\Models\AttendanceRecord;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use App\Models\Enrollment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class ClassSessionService
{
    public function __construct(
        private readonly ScheduleConflictService $scheduleConflictService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, ClassSession>
     */
    public function listForClassOffering(ClassOffering $classOffering, Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(
            ClassSession::query()->where('class_offering_id', $classOffering->id)
        )
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('session_date'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('classOffering.subject'),
                AllowedInclude::relationship('classOffering.grade'),
                AllowedInclude::relationship('classSchedule'),
                AllowedInclude::relationship('attendanceRecords'),
            )
            ->defaultSort('session_date')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /** @deprecated Use listForClassOffering */
    public function listForGroupSubject(ClassOffering $classOffering, Request $request): LengthAwarePaginator
    {
        return $this->listForClassOffering($classOffering, $request);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{session: ?ClassSession, conflicts: list<array<string, mixed>>, blocked: bool}
     */
    public function update(ClassSession $session, array $data, bool $force = false): array
    {
        $session->loadMissing(['classOffering', 'classSchedule']);

        $teacherId = array_key_exists('teacher_id', $data)
            ? (int) $data['teacher_id']
            : $session->effectiveTeacherId();
        $hallId = array_key_exists('hall_id', $data)
            ? (int) $data['hall_id']
            : $session->effectiveHallId();
        $sessionDate = (string) ($data['session_date'] ?? $session->session_date?->toDateString());
        $startTime = $this->normalizeTime((string) ($data['start_time'] ?? $session->start_time));
        $endTime = $this->normalizeTime((string) ($data['end_time'] ?? $session->end_time));

        $resourceChanged = array_key_exists('teacher_id', $data)
            || array_key_exists('hall_id', $data)
            || array_key_exists('session_date', $data)
            || array_key_exists('start_time', $data)
            || array_key_exists('end_time', $data);

        $conflicts = [];
        if ($resourceChanged) {
            $conflicts = $this->scheduleConflictService->checkSessionConflict(
                teacherId: $teacherId,
                hallId: $hallId,
                sessionDate: $sessionDate,
                startTime: $startTime,
                endTime: $endTime,
                excludingSessionId: $session->id,
            );

            if ($conflicts !== [] && ! $force) {
                return ['session' => null, 'conflicts' => $conflicts, 'blocked' => true];
            }
        }

        $payload = [];
        if (array_key_exists('teacher_id', $data)) {
            $payload['teacher_id'] = $teacherId;
        }
        if (array_key_exists('hall_id', $data)) {
            $payload['hall_id'] = $hallId;
        }
        if (array_key_exists('session_date', $data)) {
            $payload['session_date'] = $sessionDate;
        }
        if (array_key_exists('start_time', $data)) {
            $payload['start_time'] = $startTime;
        }
        if (array_key_exists('end_time', $data)) {
            $payload['end_time'] = $endTime;
        }

        if ($payload !== []) {
            $session->fill($payload);
            $session->modified_from_schedule = $this->divergesFromSchedule($session);
            $session->save();
        }

        return [
            'session' => $session->refresh()->load([
                'classOffering.subject',
                'classOffering.teacher',
                'classOffering.hall',
                'classOffering.grade',
                'classSchedule',
                'teacher',
                'hall',
            ]),
            'conflicts' => $conflicts,
            'blocked' => false,
        ];
    }

    public function cancel(ClassSession $session, string $reason): ClassSession
    {
        if ($session->status === ClassSessionStatus::Cancelled) {
            throw ValidationException::withMessages([
                'session' => ['هذه الجلسة ملغاة مسبقًا.'],
            ]);
        }

        $session->update([
            'status' => ClassSessionStatus::Cancelled,
            'cancellation_reason' => $reason,
        ]);

        return $session->refresh()->load([
            'classOffering.subject',
            'classOffering.grade',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{session: ?ClassSession, conflicts: list<array<string, mixed>>, blocked: bool}
     */
    public function createMakeup(ClassOffering $classOffering, array $data, bool $force = false): array
    {
        $classOffering->loadMissing(['grade']);

        $teacherId = (int) ($data['teacher_id'] ?? $classOffering->teacher_id);
        $hallId = (int) ($data['hall_id'] ?? $classOffering->hall_id);
        $sessionDate = (string) $data['session_date'];
        $startTime = $this->normalizeTime((string) $data['start_time']);
        $endTime = $this->normalizeTime((string) $data['end_time']);
        /** @var list<int> $studentIds */
        $studentIds = array_values(array_unique(array_map('intval', $data['student_ids'] ?? [])));

        $this->assertStudentsEnrolled($classOffering, $studentIds);

        $conflicts = $this->scheduleConflictService->checkSessionConflict(
            teacherId: $teacherId,
            hallId: $hallId,
            sessionDate: $sessionDate,
            startTime: $startTime,
            endTime: $endTime,
        );

        if ($conflicts !== [] && ! $force) {
            return ['session' => null, 'conflicts' => $conflicts, 'blocked' => true];
        }

        $session = DB::transaction(function () use (
            $classOffering,
            $teacherId,
            $hallId,
            $sessionDate,
            $startTime,
            $endTime,
            $studentIds,
        ) {
            $session = ClassSession::query()->create([
                'class_offering_id' => $classOffering->id,
                'class_schedule_id' => null,
                'teacher_id' => $teacherId,
                'hall_id' => $hallId,
                'session_date' => $sessionDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => ClassSessionStatus::Scheduled,
                'modified_from_schedule' => false,
                'is_makeup' => true,
            ]);

            foreach ($studentIds as $studentId) {
                AttendanceRecord::query()->create([
                    'class_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => AttendanceStatus::Pending,
                    'notes' => null,
                    'marked_by' => null,
                    'marked_at' => null,
                ]);
            }

            return $session;
        });

        return [
            'session' => $session->load([
                'classOffering.subject',
                'classOffering.teacher',
                'classOffering.hall',
                'classOffering.grade',
                'attendanceRecords.student',
                'teacher',
                'hall',
            ]),
            'conflicts' => $conflicts,
            'blocked' => false,
        ];
    }

    /**
     * @param  list<int>  $studentIds
     */
    private function assertStudentsEnrolled(ClassOffering $classOffering, array $studentIds): void
    {
        if ($studentIds === []) {
            throw ValidationException::withMessages([
                'student_ids' => ['يجب تحديد طالب واحد على الأقل للحصّة التعويضية.'],
            ]);
        }

        $enrolled = Enrollment::query()
            ->where('class_offering_id', $classOffering->id)
            ->where('status', EnrollmentStatus::Active)
            ->whereIn('student_id', $studentIds)
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $missing = array_values(array_diff($studentIds, $enrolled));
        if ($missing !== []) {
            throw ValidationException::withMessages([
                'student_ids' => ['بعض الطلاب غير مسجّلين فعليًا في عرض هذه المادة: '.implode(', ', $missing)],
            ]);
        }
    }

    private function divergesFromSchedule(ClassSession $session): bool
    {
        if ($session->is_makeup || $session->class_schedule_id === null) {
            return false;
        }

        $session->loadMissing(['classSchedule', 'classOffering']);
        $schedule = $session->classSchedule;
        $offering = $session->classOffering;

        if (! $schedule || ! $offering) {
            return true;
        }

        $expectedTeacher = (int) $offering->teacher_id;
        $expectedHall = (int) $offering->hall_id;
        $actualTeacher = (int) ($session->teacher_id ?? $offering->teacher_id);
        $actualHall = (int) ($session->hall_id ?? $offering->hall_id);

        $timeMatches = $this->normalizeTime((string) $session->start_time) === $this->normalizeTime((string) $schedule->start_time)
            && $this->normalizeTime((string) $session->end_time) === $this->normalizeTime((string) $schedule->end_time);

        $weekdayMatches = $session->session_date !== null
            && (int) $session->session_date->dayOfWeek === (int) $schedule->day_of_week;

        return ! (
            $timeMatches
            && $weekdayMatches
            && $actualTeacher === $expectedTeacher
            && $actualHall === $expectedHall
        );
    }

    private function normalizeTime(string $time): string
    {
        return substr($time, 0, 5);
    }
}
