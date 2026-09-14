<?php



namespace App\Services;



use App\Enums\AttendanceStatus;
use App\Enums\ClassSessionStatus;

use App\Enums\EnrollmentStatus;

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



class AttendanceService

{

    public function __construct(

        private readonly AbsenceTrackingService $absenceTrackingService,

        private readonly NotificationService $notificationService,

        private readonly TeacherScopeService $teacherScopeService,

    ) {}



    /**

     * @return Collection<int, array{student: Student, enrollment: Enrollment, attendance: ?AttendanceRecord}>

     */

    public function getRosterForSession(ClassSession $session, ?User $actor = null): Collection

    {

        if ($actor) {

            $this->teacherScopeService->assertOwnsSession($actor, $session);

        }

        if ($session->is_makeup) {

            return $this->getMakeupRoster($session);

        }



        $enrollments = Enrollment::query()

            ->where('class_offering_id', $session->class_offering_id)

            ->where('status', EnrollmentStatus::Active)

            ->with('student')

            ->orderBy('id')

            ->get();



        $records = AttendanceRecord::query()

            ->where('class_session_id', $session->id)

            ->get()

            ->keyBy('student_id');



        return $enrollments->map(function (Enrollment $enrollment) use ($records) {

            return [

                'student' => $enrollment->student,

                'enrollment' => $enrollment,

                'attendance' => $records->get($enrollment->student_id),

            ];

        });

    }



    /**

     * @return Collection<int, array{student: Student, enrollment: Enrollment, attendance: ?AttendanceRecord}>

     */

    private function getMakeupRoster(ClassSession $session): Collection

    {

        $records = AttendanceRecord::query()

            ->where('class_session_id', $session->id)

            ->with('student')

            ->get();



        $studentIds = $records->pluck('student_id')->all();



        $enrollments = Enrollment::query()

            ->where('class_offering_id', $session->class_offering_id)

            ->whereIn('student_id', $studentIds)

            ->with('student')

            ->get()

            ->keyBy('student_id');



        return $records->map(function (AttendanceRecord $record) use ($enrollments) {

            $enrollment = $enrollments->get($record->student_id);



            return [

                'student' => $record->student,

                'enrollment' => $enrollment,

                'attendance' => $record,

            ];

        })->filter(fn (array $row) => $row['enrollment'] !== null)->values();

    }



    /**

     * @param  list<array{student_id: int, status: string, notes?: ?string}>  $records

     * @return Collection<int, AttendanceRecord>

     */

    public function markAttendance(ClassSession $session, array $records, ?int $markedBy = null, ?User $actor = null): Collection

    {

        if ($actor) {

            $this->teacherScopeService->assertOwnsSession($actor, $session);

        }

        $allowedStudentIds = $session->is_makeup

            ? AttendanceRecord::query()

                ->where('class_session_id', $session->id)

                ->pluck('student_id')

                ->map(fn ($id) => (int) $id)

                ->all()

            : Enrollment::query()

                ->where('class_offering_id', $session->class_offering_id)

                ->where('status', EnrollmentStatus::Active)

                ->pluck('student_id')

                ->map(fn ($id) => (int) $id)

                ->all();



        $allowedLookup = array_flip($allowedStudentIds);



        foreach ($records as $index => $row) {

            $studentId = (int) $row['student_id'];

            if (! isset($allowedLookup[$studentId])) {

                throw ValidationException::withMessages([

                    "records.{$index}.student_id" => [

                        $session->is_makeup

                            ? 'لا يمكن تسجيل حضور لطالب غير مستهدف بهذه الحصّة التعويضية.'

                            : 'لا يمكن تسجيل حضور لطالب غير مسجّل فعليًا في شعبة هذه الجلسة.',

                    ],

                ]);

            }

        }



        $saved = DB::transaction(function () use ($session, $records, $markedBy) {

            $saved = collect();



            foreach ($records as $row) {

                $record = AttendanceRecord::query()->updateOrCreate(

                    [

                        'class_session_id' => $session->id,

                        'student_id' => (int) $row['student_id'],

                    ],

                    [

                        'status' => AttendanceStatus::from($row['status']),

                        'notes' => $row['notes'] ?? null,

                        'marked_by' => $markedBy,

                        'marked_at' => now(),

                    ]

                );



                $saved->push($record->load('student'));

            }



            if ($session->status === ClassSessionStatus::Scheduled) {

                $session->update(['status' => ClassSessionStatus::Completed]);

            }



            return $saved;

        });



        $this->triggerAbsenceChecks($session, $saved);

        $this->notifyAbsences($session, $saved);



        return $saved;

    }



    /**

     * @param  Collection<int, AttendanceRecord>  $saved

     */

    private function notifyAbsences(ClassSession $session, Collection $saved): void

    {

        foreach ($saved as $record) {

            if ($record->status !== AttendanceStatus::Absent) {

                continue;

            }



            $record->loadMissing('student.guardian');

            $student = $record->student;

            $guardian = $student?->guardian;



            if (! $student || ! $guardian) {

                continue;

            }



            $this->notificationService->send($guardian, 'attendance_absent', [

                'student_name' => $student->full_name,

                'session_date' => $session->session_date?->toDateString() ?? (string) $session->session_date,

            ]);

        }

    }



    /**

     * @param  Collection<int, AttendanceRecord>  $saved

     */

    private function triggerAbsenceChecks(ClassSession $session, Collection $saved): void

    {

        $session->loadMissing('classOffering');

        $classOffering = $session->classOffering;



        if (! $classOffering) {

            return;

        }



        foreach ($saved as $record) {

            if ($record->status !== AttendanceStatus::Absent || ! $record->student) {

                continue;

            }



            $this->absenceTrackingService->checkConsecutiveAbsences($record->student, $classOffering);

        }

    }



    /**
     * @return array{
     *     total_sessions: int,
     *     present: int,
     *     absent: int,
     *     late: int,
     *     excused: int,
     *     attendance_rate: float
     * }
     */
    public function studentAttendanceSummary(Student $student): array
    {
        $counts = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'excused' => 0,
        ];

        $dailyRecords = DailyAttendanceRecord::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', AttendanceStatus::Pending)
            ->get();

        $dailyDates = [];
        foreach ($dailyRecords as $record) {
            $status = $record->status instanceof AttendanceStatus
                ? $record->status->value
                : (string) $record->status;
            if (! isset($counts[$status])) {
                continue;
            }
            $counts[$status]++;
            $dailyDates[$record->attendance_date->toDateString()] = true;
        }

        $from = Enrollment::query()
            ->where('student_id', $student->id)
            ->min('enrolled_at');

        $sessionQuery = AttendanceRecord::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', AttendanceStatus::Pending)
            ->with('classSession:id,session_date');

        if ($from) {
            $fromDate = Carbon::parse($from)->toDateString();
            $sessionQuery->whereHas('classSession', function ($q) use ($fromDate) {
                $q->whereDate('session_date', '>=', $fromDate);
            });
        }

        // Days already covered by general (daily) attendance should not be double-counted.
        $sessionByDay = [];
        foreach ($sessionQuery->get() as $record) {
            $date = $record->classSession?->session_date;
            $dayKey = $date
                ? Carbon::parse($date)->toDateString()
                : 'session-'.$record->id;

            if (isset($dailyDates[$dayKey])) {
                continue;
            }

            $status = $record->status instanceof AttendanceStatus
                ? $record->status->value
                : (string) $record->status;

            if (! isset($counts[$status])) {
                continue;
            }

            // One effective mark per day from session attendance (prefer absent if mixed).
            if (! isset($sessionByDay[$dayKey])) {
                $sessionByDay[$dayKey] = $status;
            } elseif ($status === AttendanceStatus::Absent->value) {
                $sessionByDay[$dayKey] = $status;
            } elseif (
                $sessionByDay[$dayKey] !== AttendanceStatus::Absent->value
                && $status === AttendanceStatus::Late->value
            ) {
                $sessionByDay[$dayKey] = $status;
            }
        }

        foreach ($sessionByDay as $status) {
            if (isset($counts[$status])) {
                $counts[$status]++;
            }
        }

        $total = $counts['present'] + $counts['absent'] + $counts['late'] + $counts['excused'];
        $rate = $total > 0
            ? round((($counts['present'] + $counts['late']) / $total) * 100, 2)
            : 0.0;

        return [
            'total_sessions' => $total,
            'present' => $counts['present'],
            'absent' => $counts['absent'],
            'late' => $counts['late'],
            'excused' => $counts['excused'],
            'attendance_rate' => $rate,
        ];
    }
}

