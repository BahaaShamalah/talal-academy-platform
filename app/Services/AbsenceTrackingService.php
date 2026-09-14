<?php



namespace App\Services;



use App\Enums\AttendanceStatus;
use App\Models\AbsenceAlert;

use App\Models\AbsenceAlertThreshold;

use App\Models\AttendanceRecord;

use App\Models\ClassOffering;

use App\Models\Student;

use App\Models\SubscriptionFreeze;

use App\Models\User;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

use Illuminate\Http\Request;

use Illuminate\Support\Carbon;

use Illuminate\Validation\ValidationException;

use Spatie\QueryBuilder\AllowedFilter;

use Spatie\QueryBuilder\AllowedInclude;

use Spatie\QueryBuilder\QueryBuilder;



class AbsenceTrackingService

{

    public function checkConsecutiveAbsences(Student $student, ClassOffering $classOffering): ?AbsenceAlert

    {

        $consecutive = $this->countConsecutiveAbsences($student, $classOffering);



        if ($consecutive < 1) {

            return null;

        }



        $threshold = AbsenceAlertThreshold::query()

            ->where('consecutive_absences_count', $consecutive)

            ->where('is_active', true)

            ->first();



        if (! $threshold) {

            return null;

        }



        $exists = AbsenceAlert::query()

            ->where('student_id', $student->id)

            ->where('class_offering_id', $classOffering->id)

            ->where('consecutive_count', $consecutive)

            ->where('acknowledged', false)

            ->exists();



        if ($exists) {

            return null;

        }



        return AbsenceAlert::query()->create([

            'student_id' => $student->id,

            'class_offering_id' => $classOffering->id,

            'consecutive_count' => $consecutive,

            'alert_level' => $threshold->alert_level,

            'triggered_at' => now(),

            'acknowledged' => false,

        ]);

    }



    public function countConsecutiveAbsences(Student $student, ClassOffering $classOffering): int

    {

        $records = AttendanceRecord::query()

            ->where('student_id', $student->id)

            ->where('status', '!=', AttendanceStatus::Pending)

            ->whereHas('classSession', fn ($q) => $q->where('class_offering_id', $classOffering->id))

            ->with('classSession')

            ->get()

            ->sortByDesc(fn (AttendanceRecord $record) => $record->classSession?->session_date?->format('Y-m-d').' '.$record->id)

            ->values();



        $consecutive = 0;



        foreach ($records as $record) {

            $sessionDate = $record->classSession?->session_date;



            if (! $sessionDate || $this->isSessionDuringAttendancePause($student, $sessionDate)) {

                continue;

            }



            if ($record->status === AttendanceStatus::Absent) {

                $consecutive++;



                continue;

            }



            if (in_array($record->status, [

                AttendanceStatus::Present,

                AttendanceStatus::Late,

                AttendanceStatus::Excused,

            ], true)) {

                break;

            }

        }



        return $consecutive;

    }



    /**

     * Sessions during a freeze with pauses_attendance_expectation are excluded from streak logic.

     */

    public function isSessionDuringAttendancePause(Student $student, Carbon $sessionDate): bool

    {

        return SubscriptionFreeze::query()

            ->where('pauses_attendance_expectation', true)

            ->whereHas('subscription', fn ($q) => $q->where('student_id', $student->id))

            ->whereDate('start_date', '<=', $sessionDate->toDateString())

            ->where(function ($q) use ($sessionDate) {

                $q->whereNull('end_date')

                    ->orWhereDate('end_date', '>=', $sessionDate->toDateString());

            })

            ->exists();

    }



    /**

     * @return LengthAwarePaginator<int, AbsenceAlert>

     */

    public function listAlerts(Request $request): LengthAwarePaginator

    {

        return QueryBuilder::for(AbsenceAlert::class)

            ->allowedFilters(

                AllowedFilter::exact('acknowledged'),

                AllowedFilter::exact('alert_level'),

            )

            ->allowedIncludes(

                AllowedInclude::relationship('student'),

                AllowedInclude::relationship('classOffering.subject'),

                AllowedInclude::relationship('acknowledger'),

            )

            ->defaultSort('-triggered_at')

            ->paginate($request->integer('per_page', 15))

            ->appends($request->query());

    }



    public function acknowledge(AbsenceAlert $alert, User $user): AbsenceAlert

    {

        if ($alert->acknowledged) {

            throw ValidationException::withMessages([

                'alert' => ['هذا التنبيه مُعالَج بالفعل.'],

            ])->status(409);

        }



        $alert->update([

            'acknowledged' => true,

            'acknowledged_by' => $user->id,

            'acknowledged_at' => now(),

        ]);



        return $alert->refresh();

    }

}

