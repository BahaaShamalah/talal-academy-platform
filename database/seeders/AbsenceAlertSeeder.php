<?php

namespace Database\Seeders;

use App\Enums\AbsenceAlertLevel;
use App\Enums\AttendanceStatus;
use App\Models\AbsenceAlert;
use App\Models\ClassSession;
use App\Models\ClassOffering;
use App\Models\Student;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Database\Seeder;

class AbsenceAlertSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $offering = ClassOffering::query()->orderBy('id')->firstOrFail();
        $sara = Student::query()->where('full_name', 'سارة محمد')->firstOrFail();

        $sessions = ClassSession::query()
            ->where('class_offering_id', $offering->id)
            ->orderBy('session_date')
            ->orderBy('id')
            ->take(3)
            ->get();

        if ($sessions->count() < 3) {
            return;
        }

        /** @var AttendanceService $attendance */
        $attendance = app(AttendanceService::class);

        // AttendanceSessionSeeder already marked sara absent on the first session.
        $attendance->markAttendance($sessions[1], [
            [
                'student_id' => $sara->id,
                'status' => AttendanceStatus::Absent->value,
                'notes' => 'غياب متتالي — جلسة 2',
            ],
        ], $admin->id);

        $noticeAlert = AbsenceAlert::query()
            ->where('student_id', $sara->id)
            ->where('class_offering_id', $offering->id)
            ->where('consecutive_count', 2)
            ->where('acknowledged', false)
            ->first();

        if (! $noticeAlert || $noticeAlert->alert_level !== AbsenceAlertLevel::Notice) {
            throw new \RuntimeException('Seeder check failed: notice alert (2 consecutive) not created');
        }

        $attendance->markAttendance($sessions[2], [
            [
                'student_id' => $sara->id,
                'status' => AttendanceStatus::Absent->value,
                'notes' => 'غياب متتالي — جلسة 3',
            ],
        ], $admin->id);

        $followUpAlert = AbsenceAlert::query()
            ->where('student_id', $sara->id)
            ->where('class_offering_id', $offering->id)
            ->where('consecutive_count', 3)
            ->where('acknowledged', false)
            ->first();

        if (! $followUpAlert || $followUpAlert->alert_level !== AbsenceAlertLevel::FollowUp) {
            throw new \RuntimeException('Seeder check failed: follow_up alert (3 consecutive) not created');
        }

        $duplicateNotice = AbsenceAlert::query()
            ->where('student_id', $sara->id)
            ->where('class_offering_id', $offering->id)
            ->where('consecutive_count', 2)
            ->where('acknowledged', false)
            ->count();

        if ($duplicateNotice !== 1) {
            throw new \RuntimeException('Seeder check failed: duplicate notice alerts for count=2');
        }
    }
}
