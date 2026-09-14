<?php

namespace App\Services;

use App\Models\ClassSession;
use App\Models\User;

class TeacherScheduleService
{
    public function __construct(
        private readonly GuardianScheduleService $guardianScheduleService,
        private readonly SessionGeneratorService $sessionGeneratorService,
        private readonly TeacherScopeService $teacherScopeService,
    ) {}

    /**
     * @return array{
     *     sessions: list<array<string, mixed>>,
     *     meta: array{view: string, range_start: string, range_end: string}
     * }
     */
    public function scheduleForTeacher(User $teacher, string $view, string $date): array
    {
        $view = in_array($view, ['day', 'week', 'month'], true) ? $view : 'week';
        [$rangeStart, $rangeEnd] = $this->guardianScheduleService->resolveViewRange($view, $date);

        $offerings = $this->teacherScopeService->ownedClassOfferings($teacher);
        $start = $rangeStart->toDateString();
        $end = $rangeEnd->toDateString();

        $this->sessionGeneratorService->ensureSessionsInRange($offerings, $start, $end);

        $offeringIds = $offerings->pluck('id')->map(fn ($id) => (int) $id)->all();

        $sessions = ClassSession::query()
            ->whereIn('class_offering_id', $offeringIds ?: [0])
            ->whereDate('session_date', '>=', $start)
            ->whereDate('session_date', '<=', $end)
            ->with(['classOffering.subject', 'classOffering.hall', 'classOffering.grade', 'hall'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(fn (ClassSession $session) => $this->guardianScheduleService->formatSession($session))
            ->values()
            ->all();

        return [
            'sessions' => $sessions,
            'meta' => [
                'view' => $view,
                'range_start' => $start,
                'range_end' => $end,
            ],
        ];
    }
}
