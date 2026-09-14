<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\ClassOffering;
use App\Models\Student;
use App\Models\User;
use App\Services\AttendanceService;
use App\Services\SessionGeneratorService;
use Illuminate\Database\Seeder;

class AttendanceSessionSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->first();
        $offering = ClassOffering::query()->with('schedules')->orderBy('id')->first();
        $students = Student::query()->orderBy('id')->take(3)->get();

        if (! $admin || ! $offering || $students->count() < 2 || $offering->schedules->isEmpty()) {
            return;
        }

        foreach ($students as $student) {
            Enrollment::query()->updateOrCreate(
                [
                    'student_id' => $student->id,
                    'class_offering_id' => $offering->id,
                ],
                [
                    'status' => EnrollmentStatus::Active,
                    'enrolled_at' => now()->subDays(7),
                    'created_by' => $admin->id,
                ]
            );
        }

        /** @var SessionGeneratorService $generator */
        $generator = app(SessionGeneratorService::class);
        $from = now()->toDateString();
        $to = now()->addWeeks(2)->toDateString();

        $result = $generator->generateSessions($offering, $from, $to);
        $firstSession = collect($result['sessions'])->sortBy('session_date')->first();

        if (! $firstSession) {
            return;
        }

        /** @var AttendanceService $attendance */
        $attendance = app(AttendanceService::class);

        $records = [
            [
                'student_id' => $students[0]->id,
                'status' => AttendanceStatus::Present->value,
                'notes' => null,
            ],
            [
                'student_id' => $students[1]->id,
                'status' => AttendanceStatus::Absent->value,
                'notes' => 'غائب بدون عذر',
            ],
        ];

        if ($students->count() >= 3) {
            $records[] = [
                'student_id' => $students[2]->id,
                'status' => AttendanceStatus::Present->value,
                'notes' => null,
            ];
        }

        $attendance->markAttendance($firstSession, $records, $admin->id);
    }
}
