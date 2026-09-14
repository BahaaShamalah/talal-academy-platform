<?php

namespace App\Services;

use App\Enums\ClassSessionStatus;
use App\Models\ClassOffering;
use App\Models\ClassSchedule;
use App\Models\ClassSession;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClassScheduleService
{
    public function __construct(
        private readonly ScheduleConflictService $scheduleConflictService,
        private readonly SessionGeneratorService $sessionGeneratorService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, ClassSchedule>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return ClassSchedule::query()
            ->with('classOffering')
            ->latest()
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{schedule: ?ClassSchedule, conflicts: list<array<string, mixed>>, blocked: bool}
     */
    public function create(array $data, bool $force = false): array
    {
        $conflicts = $this->conflictsForClassOffering(
            classOfferingId: (int) $data['class_offering_id'],
            dayOfWeek: (int) $data['day_of_week'],
            startTime: (string) $data['start_time'],
            endTime: (string) $data['end_time'],
            teacherId: isset($data['teacher_id']) ? (int) $data['teacher_id'] : null,
            hallId: isset($data['hall_id']) ? (int) $data['hall_id'] : null,
        );

        if ($conflicts !== [] && ! $force) {
            return ['schedule' => null, 'conflicts' => $conflicts, 'blocked' => true];
        }

        $schedule = ClassSchedule::query()->create([
            'class_offering_id' => (int) $data['class_offering_id'],
            'day_of_week' => (int) $data['day_of_week'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
        ]);

        $classOffering = ClassOffering::query()
            ->with(['period', 'schedules'])
            ->findOrFail((int) $data['class_offering_id']);

        $this->generateSessionsForOffering($classOffering);

        return [
            'schedule' => $schedule->load([
                'classOffering.subject',
                'classOffering.teacher',
                'classOffering.hall',
                'classOffering.grade',
            ]),
            'conflicts' => $conflicts,
            'blocked' => false,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{schedule: ?ClassSchedule, conflicts: list<array<string, mixed>>, blocked: bool, updated_sessions: int}
     */
    public function update(ClassSchedule $classSchedule, array $data, bool $force = false): array
    {
        $classOfferingId = (int) ($data['class_offering_id'] ?? $classSchedule->class_offering_id);
        $dayOfWeek = (int) ($data['day_of_week'] ?? $classSchedule->day_of_week);
        $startTime = $this->normalizeTime((string) ($data['start_time'] ?? $classSchedule->start_time));
        $endTime = $this->normalizeTime((string) ($data['end_time'] ?? $classSchedule->end_time));
        $teacherOverride = array_key_exists('teacher_id', $data) ? (int) $data['teacher_id'] : null;
        $hallOverride = array_key_exists('hall_id', $data) ? (int) $data['hall_id'] : null;

        $conflicts = $this->conflictsForClassOffering(
            classOfferingId: $classOfferingId,
            dayOfWeek: $dayOfWeek,
            startTime: $startTime,
            endTime: $endTime,
            excludingScheduleId: $classSchedule->id,
            teacherId: $teacherOverride,
            hallId: $hallOverride,
        );

        if ($conflicts !== [] && ! $force) {
            return [
                'schedule' => null,
                'conflicts' => $conflicts,
                'blocked' => true,
                'updated_sessions' => 0,
            ];
        }

        $dayChanged = $dayOfWeek !== (int) $classSchedule->day_of_week;
        $updatedSessions = 0;

        DB::transaction(function () use (
            $classSchedule,
            $classOfferingId,
            $dayOfWeek,
            $startTime,
            $endTime,
            $teacherOverride,
            $hallOverride,
            $dayChanged,
            &$updatedSessions,
        ) {
            $classOffering = ClassOffering::query()->findOrFail($classOfferingId);

            if ($teacherOverride !== null) {
                $classOffering->teacher_id = $teacherOverride;
            }
            if ($hallOverride !== null) {
                $classOffering->hall_id = $hallOverride;
            }
            if ($classOffering->isDirty()) {
                $classOffering->save();
            }

            $classSchedule->update([
                'class_offering_id' => $classOfferingId,
                'day_of_week' => $dayOfWeek,
                'start_time' => $startTime,
                'end_time' => $endTime,
            ]);

            $classOffering->refresh();
            $today = now()->toDateString();

            $futureSessions = ClassSession::query()
                ->where('class_schedule_id', $classSchedule->id)
                ->where('status', ClassSessionStatus::Scheduled)
                ->whereDate('session_date', '>=', $today)
                ->where('modified_from_schedule', false)
                ->get();

            foreach ($futureSessions as $session) {
                $payload = [
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'teacher_id' => (int) $classOffering->teacher_id,
                    'hall_id' => (int) $classOffering->hall_id,
                ];

                if ($dayChanged && $session->session_date) {
                    $payload['session_date'] = $this->dateForDayInSameWeek(
                        $session->session_date->copy(),
                        $dayOfWeek,
                    );
                }

                $session->update($payload);
                $updatedSessions++;
            }
        });

        $classOffering = ClassOffering::query()
            ->with(['period', 'schedules'])
            ->findOrFail($classOfferingId);

        $this->generateSessionsForOffering($classOffering);

        return [
            'schedule' => $classSchedule->refresh()->load([
                'classOffering.subject',
                'classOffering.teacher',
                'classOffering.hall',
                'classOffering.grade',
            ]),
            'conflicts' => $conflicts,
            'blocked' => false,
            'updated_sessions' => $updatedSessions,
        ];
    }

    public function delete(ClassSchedule $classSchedule): void
    {
        $classSchedule->delete();
    }

    /**
     * Saturday-start week: Sat=0 … Fri=6 relative offset.
     */
    private function dateForDayInSameWeek(Carbon $original, int $newDayOfWeek): string
    {
        $weekStart = $original->copy()->startOfWeek(Carbon::SATURDAY);
        $offsetFromSaturday = ($newDayOfWeek + 1) % 7;

        return $weekStart->addDays($offsetFromSaturday)->toDateString();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function conflictsForClassOffering(
        int $classOfferingId,
        int $dayOfWeek,
        string $startTime,
        string $endTime,
        ?int $excludingScheduleId = null,
        ?int $teacherId = null,
        ?int $hallId = null,
    ): array {
        $classOffering = ClassOffering::query()->findOrFail($classOfferingId);

        return $this->scheduleConflictService->checkConflict(
            teacherId: $teacherId ?? (int) $classOffering->teacher_id,
            hallId: $hallId ?? (int) $classOffering->hall_id,
            dayOfWeek: $dayOfWeek,
            startTime: $startTime,
            endTime: $endTime,
            periodId: $classOffering->period_id !== null
                ? (int) $classOffering->period_id
                : null,
            excludingScheduleId: $excludingScheduleId,
        );
    }

    private function normalizeTime(string $time): string
    {
        return substr($time, 0, 5);
    }

    private function generateSessionsForOffering(ClassOffering $classOffering): void
    {
        try {
            $this->sessionGeneratorService->generateSessionsThroughPeriod(
                $classOffering->fresh(['schedules']),
            );
        } catch (ValidationException) {
            // No schedule, period, or invalid range.
        }
    }
}
