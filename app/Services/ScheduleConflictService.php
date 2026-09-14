<?php



namespace App\Services;

use App\Support\TimeFormatter;



use App\Enums\ClassOfferingStatus;

use App\Enums\ClassSessionStatus;

use App\Models\ClassSchedule;

use App\Models\ClassSession;



class ScheduleConflictService

{

    /**

     * @return list<array{

     *     resource: 'teacher'|'hall',

     *     resource_label: string,

     *     schedule_id: int,

     *     class_offering_id: int,

     *     grade_id: int,

     *     grade_name: string|null,

     *     subject_name: string|null,

     *     teacher_name: string|null,

     *     hall_name: string|null,

     *     day_of_week: int,

     *     start_time: string,

     *     end_time: string,

     *     message: string

     * }>

     */

    public function checkConflict(

        int $teacherId,

        int $hallId,

        int $dayOfWeek,

        string $startTime,

        string $endTime,

        ?int $periodId,

        ?int $excludingScheduleId = null,

    ): array {

        $startTime = $this->normalizeTime($startTime);

        $endTime = $this->normalizeTime($endTime);



        $candidates = ClassSchedule::query()

            ->where('day_of_week', $dayOfWeek)

            ->when(

                $excludingScheduleId !== null,

                fn ($q) => $q->whereKeyNot($excludingScheduleId),

            )

            ->whereHas('classOffering', function ($q) use ($teacherId, $hallId, $periodId) {

                $q->where('status', ClassOfferingStatus::Active)

                    ->where(function ($inner) use ($teacherId, $hallId) {

                        $inner->where('teacher_id', $teacherId)

                            ->orWhere('hall_id', $hallId);

                    })

                    ->when(

                        $periodId === null,

                        fn ($inner) => $inner->whereNull('period_id'),

                        fn ($inner) => $inner->where('period_id', $periodId),

                    );

            })

            ->with([

                'classOffering.subject',

                'classOffering.teacher',

                'classOffering.hall',

                'classOffering.grade',

            ])

            ->get();



        $conflicts = [];



        foreach ($candidates as $schedule) {

            if (! $this->timesOverlap(

                $startTime,

                $endTime,

                $this->normalizeTime((string) $schedule->start_time),

                $this->normalizeTime((string) $schedule->end_time),

            )) {

                continue;

            }



            $offering = $schedule->classOffering;

            if (! $offering) {

                continue;

            }



            $subjectName = $offering->subject?->name ?? 'مادة';

            $gradeName = $offering->grade?->name ?? 'صف';

            $overlapLabel = $this->normalizeTime((string) $schedule->start_time)

                .'–'.$this->normalizeTime((string) $schedule->end_time);



            if ((int) $offering->teacher_id === $teacherId) {

                $conflicts[] = $this->buildScheduleConflictRow(

                    resource: 'teacher',

                    schedule: $schedule,

                    subjectName: $subjectName,

                    gradeName: $gradeName,

                    overlapLabel: $overlapLabel,

                    message: "يتعارض مع: {$subjectName} — {$gradeName} — {$overlapLabel} (نفس المعلم)",

                );

            }



            if ((int) $offering->hall_id === $hallId) {

                $conflicts[] = $this->buildScheduleConflictRow(

                    resource: 'hall',

                    schedule: $schedule,

                    subjectName: $subjectName,

                    gradeName: $gradeName,

                    overlapLabel: $overlapLabel,

                    message: "يتعارض مع: {$subjectName} — {$gradeName} — {$overlapLabel} (نفس القاعة)",

                );

            }

        }



        return $conflicts;

    }



    /**

     * Conflict check against actual class_sessions on a concrete session_date.

     *

     * @return list<array{

     *     resource: 'teacher'|'hall',

     *     resource_label: string,

     *     session_id: int,

     *     class_offering_id: int,

     *     grade_id: int,

     *     grade_name: string|null,

     *     subject_name: string|null,

     *     teacher_name: string|null,

     *     hall_name: string|null,

     *     session_date: string,

     *     start_time: string,

     *     end_time: string,

     *     message: string

     * }>

     */

    public function checkSessionConflict(

        int $teacherId,

        int $hallId,

        string $sessionDate,

        string $startTime,

        string $endTime,

        ?int $excludingSessionId = null,

    ): array {

        $startTime = $this->normalizeTime($startTime);

        $endTime = $this->normalizeTime($endTime);



        $candidates = ClassSession::query()

            ->whereDate('session_date', $sessionDate)

            ->where('status', '!=', ClassSessionStatus::Cancelled)

            ->when(

                $excludingSessionId !== null,

                fn ($q) => $q->whereKeyNot($excludingSessionId),

            )

            ->with([

                'classOffering.subject',

                'classOffering.teacher',

                'classOffering.hall',

                'classOffering.grade',

                'teacher',

                'hall',

            ])

            ->get();



        $conflicts = [];



        foreach ($candidates as $other) {

            if (! $this->timesOverlap(

                $startTime,

                $endTime,

                $this->normalizeTime((string) $other->start_time),

                $this->normalizeTime((string) $other->end_time),

            )) {

                continue;

            }



            $offering = $other->classOffering;

            $effectiveTeacherId = (int) ($other->teacher_id ?? $offering?->teacher_id);

            $effectiveHallId = (int) ($other->hall_id ?? $offering?->hall_id);



            $subjectName = $offering?->subject?->name ?? 'مادة';

            $gradeName = $offering?->grade?->name ?? 'صف';

            $overlapLabel = $this->normalizeTime((string) $other->start_time)

                .'–'.$this->normalizeTime((string) $other->end_time);

            $dateLabel = $other->session_date?->toDateString() ?? $sessionDate;



            if ($effectiveTeacherId === $teacherId) {

                $conflicts[] = $this->buildSessionConflictRow(

                    resource: 'teacher',

                    session: $other,

                    subjectName: $subjectName,

                    gradeName: $gradeName,

                    message: "يتعارض مع جلسة: {$subjectName} — {$gradeName} — {$dateLabel} {$overlapLabel} (نفس المعلم)",

                );

            }



            if ($effectiveHallId === $hallId) {

                $conflicts[] = $this->buildSessionConflictRow(

                    resource: 'hall',

                    session: $other,

                    subjectName: $subjectName,

                    gradeName: $gradeName,

                    message: "يتعارض مع جلسة: {$subjectName} — {$gradeName} — {$dateLabel} {$overlapLabel} (نفس القاعة)",

                );

            }

        }



        return $conflicts;

    }



    /**

     * @return array<string, mixed>

     */

    private function buildScheduleConflictRow(

        string $resource,

        ClassSchedule $schedule,

        string $subjectName,

        string $gradeName,

        string $overlapLabel,

        string $message,

    ): array {

        $offering = $schedule->classOffering;



        return [

            'resource' => $resource,

            'resource_label' => $resource === 'teacher' ? 'معلم' : 'قاعة',

            'schedule_id' => $schedule->id,

            'class_offering_id' => (int) $schedule->class_offering_id,

            'grade_id' => (int) ($offering?->grade_id ?? 0),

            'grade_name' => $offering?->grade?->name,

            'subject_name' => $offering?->subject?->name,

            'teacher_name' => $offering?->teacher?->name,

            'hall_name' => $offering?->hall?->name,

            'day_of_week' => (int) $schedule->day_of_week,

            'start_time' => $this->normalizeTime((string) $schedule->start_time),

            'end_time' => $this->normalizeTime((string) $schedule->end_time),

            'message' => $message,

        ];

    }



    /**

     * @return array<string, mixed>

     */

    private function buildSessionConflictRow(

        string $resource,

        ClassSession $session,

        string $subjectName,

        string $gradeName,

        string $message,

    ): array {

        $offering = $session->classOffering;

        $teacher = $session->teacher ?? $offering?->teacher;

        $hall = $session->hall ?? $offering?->hall;



        return [

            'resource' => $resource,

            'resource_label' => $resource === 'teacher' ? 'معلم' : 'قاعة',

            'session_id' => $session->id,

            'class_offering_id' => (int) $session->class_offering_id,

            'grade_id' => (int) ($offering?->grade_id ?? 0),

            'grade_name' => $offering?->grade?->name,

            'subject_name' => $offering?->subject?->name,

            'teacher_name' => $teacher?->name,

            'hall_name' => $hall?->name,

            'session_date' => $session->session_date?->toDateString(),

            'start_time' => $this->normalizeTime((string) $session->start_time),

            'end_time' => $this->normalizeTime((string) $session->end_time),

            'message' => $message,

        ];

    }



    private function timesOverlap(string $aStart, string $aEnd, string $bStart, string $bEnd): bool

    {

        return $aStart < $bEnd && $bStart < $aEnd;

    }



    private function normalizeTime(string $time): string

    {

        return TimeFormatter::to12Hour($time) ?? $time;

    }

}

