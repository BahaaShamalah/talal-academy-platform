<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\ClassOfferingStatus;
use App\Enums\ClassSessionStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\StudentStatus;
use App\Models\AttendanceRecord;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use App\Models\DailyAttendanceRecord;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceBoardService
{
    public function __construct(
        private readonly TeacherScopeService $teacherScopeService,
        private readonly SessionGeneratorService $sessionGeneratorService,
        private readonly AttendanceService $attendanceService,
    ) {}

    /**
     * @return array{date: string, scoped_to_teacher: bool, sections: list<array<string, mixed>>}
     */
    public function board(
        User $actor,
        string $date,
        ?int $stageId = null,
        ?int $gradeId = null,
        ?int $gradeSectionId = null,
    ): array {
        $day = Carbon::parse($date)->startOfDay();
        $weekday = (int) $day->dayOfWeek;

        $students = $this->eligibleStudents($actor, $stageId, $gradeId, $gradeSectionId);
        $offerings = $this->matchingOfferings($actor, $stageId, $gradeId, $gradeSectionId);

        foreach ($offerings as $offering) {
            $meetsToday = $offering->schedules
                ->contains(fn ($schedule) => (int) $schedule->day_of_week === $weekday);
            if (! $meetsToday) {
                continue;
            }

            try {
                $this->sessionGeneratorService->generateSessions(
                    $offering,
                    $day->toDateString(),
                    $day->toDateString(),
                );
            } catch (ValidationException) {
                // No slot that day.
            }
        }

        $offeringIds = $offerings->pluck('id')->map(fn ($id) => (int) $id)->all();
        $studentIds = $students->pluck('id')->map(fn ($id) => (int) $id)->all();

        $sessions = ClassSession::query()
            ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0])
            ->whereDate('session_date', $day->toDateString())
            ->where('status', '!=', ClassSessionStatus::Cancelled)
            ->with(['classOffering.subject'])
            ->orderBy('start_time')
            ->get();

        $enrollments = Enrollment::query()
            ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0])
            ->whereIn('status', [
                EnrollmentStatus::Active,
                EnrollmentStatus::PendingPayment,
            ])
            ->get();

        $sessionRecords = AttendanceRecord::query()
            ->whereIn('class_session_id', $sessions->pluck('id')->all() ?: [0])
            ->get()
            ->groupBy('class_session_id');

        $dailyRecords = DailyAttendanceRecord::query()
            ->whereDate('attendance_date', $day->toDateString())
            ->whereIn('student_id', $studentIds !== [] ? $studentIds : [0])
            ->get()
            ->keyBy('student_id');

        $sections = $this->buildSections(
            $students,
            $offerings,
            $sessions,
            $enrollments,
            $sessionRecords,
            $dailyRecords,
        );

        return [
            'date' => $day->toDateString(),
            'scoped_to_teacher' => ! $this->teacherScopeService->bypassesScope($actor),
            'sections' => $sections,
        ];
    }

    /**
     * @param  list<array{student_id: int, status: string, notes?: ?string}>  $records
     * @return array{date: string, scoped_to_teacher: bool, sections: list<array<string, mixed>>}
     */
    public function mark(
        User $actor,
        string $date,
        array $records,
        ?int $gradeSectionId = null,
        ?int $gradeId = null,
    ): array {
        $board = $this->board($actor, $date, null, $gradeId, $gradeSectionId);
        $allowed = collect($board['sections'])
            ->when(
                $gradeSectionId,
                fn (Collection $sections) => $sections->where('grade_section_id', $gradeSectionId),
            )
            ->when(
                ! $gradeSectionId && $gradeId,
                fn (Collection $sections) => $sections
                    ->where('grade_id', $gradeId)
                    ->where('grade_section_id', null),
            )
            ->flatMap(fn (array $section) => $section['students'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($gradeSectionId === null && $gradeId === null) {
            $allowed = collect($board['sections'])
                ->flatMap(fn (array $section) => $section['students'])
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $allowedLookup = array_flip($allowed);

        foreach ($records as $index => $row) {
            if (! isset($allowedLookup[(int) $row['student_id']])) {
                throw ValidationException::withMessages([
                    "records.{$index}.student_id" => ['هذا الطالب غير ظاهر في لوحة الحضور.'],
                ]);
            }
        }

        $day = Carbon::parse($date)->toDateString();

        DB::transaction(function () use ($actor, $day, $records, $board, $gradeSectionId, $gradeId) {
            foreach ($records as $row) {
                DailyAttendanceRecord::query()->updateOrCreate(
                    [
                        'student_id' => (int) $row['student_id'],
                        'attendance_date' => $day,
                    ],
                    [
                        'status' => AttendanceStatus::from($row['status']),
                        'notes' => $row['notes'] ?? null,
                        'marked_by' => $actor->id,
                        'marked_at' => now(),
                    ],
                );
            }

            $targetSections = collect($board['sections']);
            if ($gradeSectionId) {
                $targetSections = $targetSections->where('grade_section_id', $gradeSectionId);
            } elseif ($gradeId) {
                $targetSections = $targetSections->where('grade_id', $gradeId)->where('grade_section_id', null);
            }

            $sessionIds = $targetSections->flatMap(fn (array $s) => $s['session_ids'] ?? [])->unique()->all();
            if ($sessionIds === []) {
                return;
            }

            $sessions = ClassSession::query()->whereIn('id', $sessionIds)->get();
            $enrollmentsByOffering = Enrollment::query()
                ->whereIn('class_offering_id', $sessions->pluck('class_offering_id')->all() ?: [0])
                ->whereIn('status', [
                    EnrollmentStatus::Active,
                    EnrollmentStatus::PendingPayment,
                ])
                ->get()
                ->groupBy('class_offering_id');

            $byStudent = collect($records)->keyBy(fn (array $row) => (int) $row['student_id']);

            foreach ($sessions as $session) {
                $rosterIds = ($enrollmentsByOffering->get($session->class_offering_id) ?? collect())
                    ->pluck('student_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $subset = [];
                foreach ($rosterIds as $studentId) {
                    $row = $byStudent->get($studentId);
                    if ($row) {
                        $subset[] = $row;
                    }
                }

                if ($subset !== []) {
                    $this->attendanceService->markAttendance($session, $subset, $actor->id, $actor);
                }
            }
        });

        return $this->board($actor, $date, null, $gradeId, $gradeSectionId);
    }

    /**
     * @return Collection<int, Student>
     */
    private function eligibleStudents(
        User $actor,
        ?int $stageId,
        ?int $gradeId,
        ?int $gradeSectionId,
    ): Collection {
        $query = Student::query()
            ->where('status', StudentStatus::Active)
            ->with([
                'currentGrade.educationalStage',
                'enrollments' => fn ($q) => $q
                    ->whereIn('status', [
                        EnrollmentStatus::Active,
                        EnrollmentStatus::PendingPayment,
                    ])
                    ->with(['classOffering.gradeSection', 'classOffering.grade.educationalStage']),
            ])
            ->orderBy('full_name');

        if (! $this->teacherScopeService->bypassesScope($actor)) {
            $offeringIds = $this->teacherScopeService->teacherClassOfferingIds($actor);
            $query->whereHas(
                'enrollments',
                fn ($q) => $q
                    ->whereIn('status', [EnrollmentStatus::Active, EnrollmentStatus::PendingPayment])
                    ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0]),
            );
        }

        if ($gradeSectionId) {
            $query->whereHas(
                'enrollments.classOffering',
                fn ($q) => $q->where('grade_section_id', $gradeSectionId),
            );
        }
        if ($gradeId) {
            $query->where(function ($q) use ($gradeId) {
                $q->where('current_grade_id', $gradeId)
                    ->orWhereHas('enrollments.classOffering', fn ($inner) => $inner->where('grade_id', $gradeId));
            });
        }
        if ($stageId) {
            $query->where(function ($q) use ($stageId) {
                $q->whereHas('currentGrade', fn ($g) => $g->where('educational_stage_id', $stageId))
                    ->orWhereHas(
                        'enrollments.classOffering.grade',
                        fn ($g) => $g->where('educational_stage_id', $stageId),
                    );
            });
        }

        return $query->get();
    }

    /**
     * @return Collection<int, ClassOffering>
     */
    private function matchingOfferings(
        User $actor,
        ?int $stageId,
        ?int $gradeId,
        ?int $gradeSectionId,
    ): Collection {
        $query = ClassOffering::query()
            ->where('status', ClassOfferingStatus::Active)
            ->with(['subject', 'grade.educationalStage', 'gradeSection', 'schedules']);

        if (! $this->teacherScopeService->bypassesScope($actor)) {
            $query->where('teacher_id', $actor->id);
        }

        if ($gradeSectionId) {
            $query->where('grade_section_id', $gradeSectionId);
        }
        if ($gradeId) {
            $query->where('grade_id', $gradeId);
        }
        if ($stageId) {
            $query->whereHas('grade', fn ($q) => $q->where('educational_stage_id', $stageId));
        }

        return $query->orderBy('id')->get();
    }

    /**
     * @param  Collection<int, Student>  $students
     * @param  Collection<int, ClassOffering>  $offerings
     * @param  Collection<int, ClassSession>  $sessions
     * @param  Collection<int, Enrollment>  $enrollments
     * @param  Collection<int, Collection<int, AttendanceRecord>>  $sessionRecords
     * @param  Collection<int, DailyAttendanceRecord>  $dailyRecords
     * @return list<array<string, mixed>>
     */
    private function buildSections(
        Collection $students,
        Collection $offerings,
        Collection $sessions,
        Collection $enrollments,
        Collection $sessionRecords,
        Collection $dailyRecords,
    ): array {
        $sessionsByOffering = $sessions->groupBy('class_offering_id');
        $enrollmentsByOffering = $enrollments->groupBy('class_offering_id');
        $offeringsBySection = $offerings->groupBy(
            fn (ClassOffering $o) => $o->grade_section_id ? 's-'.$o->grade_section_id : 'g-'.$o->grade_id,
        );

        $buckets = [];

        foreach ($students as $student) {
            $meta = $this->studentGroupMeta($student);
            $key = $meta['key'];
            if (! isset($buckets[$key])) {
                $sectionOfferings = $offeringsBySection->get($key) ?? collect();
                $offeringIds = $sectionOfferings->pluck('id')->map(fn ($id) => (int) $id);
                $sectionSessions = $offeringIds
                    ->flatMap(fn ($id) => $sessionsByOffering->get($id) ?? collect())
                    ->values();

                $buckets[$key] = [
                    'meta' => $meta,
                    'offerings' => $sectionOfferings,
                    'sessions' => $sectionSessions,
                    'students' => [],
                ];
            }

            $sectionSessions = $buckets[$key]['sessions'];
            $studentSessions = [];
            foreach ($sectionSessions as $session) {
                $inOffering = ($enrollmentsByOffering->get($session->class_offering_id) ?? collect())
                    ->contains(fn (Enrollment $e) => (int) $e->student_id === (int) $student->id);
                if (! $inOffering) {
                    continue;
                }

                $record = ($sessionRecords->get($session->id) ?? collect())
                    ->firstWhere('student_id', $student->id);
                $sessionStatus = $record?->status instanceof AttendanceStatus
                    ? $record->status->value
                    : ($record?->status ? (string) $record->status : null);
                if ($sessionStatus === AttendanceStatus::Pending->value) {
                    $sessionStatus = null;
                }

                $studentSessions[] = [
                    'id' => $session->id,
                    'subject_name' => $session->classOffering?->subject?->name,
                    'start_time' => substr((string) $session->start_time, 0, 5),
                    'status' => $sessionStatus,
                ];
            }

            $daily = $dailyRecords->get($student->id);
            $dailyStatus = $daily?->status instanceof AttendanceStatus
                ? $daily->status->value
                : ($daily?->status ? (string) $daily->status : null);

            $buckets[$key]['students'][] = [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'file_number' => $student->file_number,
                'status' => $dailyStatus ?: $this->aggregateStatus(array_column($studentSessions, 'status')),
                'sessions' => $studentSessions,
            ];
        }

        $sections = [];
        foreach ($buckets as $bucket) {
            $meta = $bucket['meta'];
            $studentRows = $bucket['students'];
            usort($studentRows, fn ($a, $b) => strcmp($a['full_name'], $b['full_name']));

            $subjects = collect($bucket['offerings'])
                ->map(fn (ClassOffering $o) => $o->subject?->name)
                ->filter()
                ->unique()
                ->values()
                ->all();

            $sections[] = [
                'group_key' => $meta['key'],
                'grade_section_id' => $meta['grade_section_id'],
                'grade_section_name' => $meta['grade_section_name'],
                'grade_id' => $meta['grade_id'],
                'grade_name' => $meta['grade_name'],
                'stage_id' => $meta['stage_id'],
                'stage_name' => $meta['stage_name'],
                'gender' => $meta['gender'],
                'subjects' => $subjects,
                'session_ids' => collect($bucket['sessions'])->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                'has_sessions_today' => collect($bucket['sessions'])->isNotEmpty(),
                'students' => $studentRows,
            ];
        }

        usort($sections, function (array $a, array $b) {
            return [$a['stage_name'] ?? '', $a['grade_name'] ?? '', $a['grade_section_name'] ?? '']
                <=> [$b['stage_name'] ?? '', $b['grade_name'] ?? '', $b['grade_section_name'] ?? ''];
        });

        return $sections;
    }

    /**
     * @return array{
     *     key: string,
     *     grade_section_id: ?int,
     *     grade_section_name: string,
     *     grade_id: ?int,
     *     grade_name: ?string,
     *     stage_id: ?int,
     *     stage_name: ?string,
     *     gender: ?string
     * }
     */
    private function studentGroupMeta(Student $student): array
    {
        $sectionCounts = [];
        foreach ($student->enrollments as $enrollment) {
            $offering = $enrollment->classOffering;
            if (! $offering?->grade_section_id) {
                continue;
            }
            $id = (int) $offering->grade_section_id;
            $sectionCounts[$id] = ($sectionCounts[$id] ?? 0) + 1;
        }

        if ($sectionCounts !== []) {
            arsort($sectionCounts);
            $sectionId = (int) array_key_first($sectionCounts);
            $offering = $student->enrollments
                ->first(fn (Enrollment $e) => (int) $e->classOffering?->grade_section_id === $sectionId)
                ?->classOffering;
            $section = $offering?->gradeSection;
            $grade = $offering?->grade ?? $student->currentGrade;

            return [
                'key' => 's-'.$sectionId,
                'grade_section_id' => $sectionId,
                'grade_section_name' => $section?->name ?? 'شعبة',
                'grade_id' => $grade?->id,
                'grade_name' => $grade?->name,
                'stage_id' => $grade?->educational_stage_id,
                'stage_name' => $grade?->educationalStage?->name,
                'gender' => $section?->gender?->value ?? $offering?->gender?->value,
            ];
        }

        $grade = $student->currentGrade;

        return [
            'key' => 'g-'.($grade?->id ?? 0),
            'grade_section_id' => null,
            'grade_section_name' => 'بدون شعبة',
            'grade_id' => $grade?->id,
            'grade_name' => $grade?->name,
            'stage_id' => $grade?->educational_stage_id,
            'stage_name' => $grade?->educationalStage?->name,
            'gender' => $student->gender?->value,
        ];
    }

    /**
     * @param  list<string|null>  $statuses
     */
    private function aggregateStatus(array $statuses): ?string
    {
        $marked = array_values(array_filter($statuses, fn ($s) => $s !== null && $s !== ''));
        if ($marked === []) {
            return null;
        }
        $unique = array_values(array_unique($marked));

        return count($unique) === 1 ? $unique[0] : 'mixed';
    }
}
