<?php

namespace Database\Seeders;

use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelationship;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\ClassOffering;
use App\Models\Guardian;
use App\Models\User;
use App\Services\StudentService;
use Illuminate\Database\Seeder;

class StudentEnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $offerings = ClassOffering::query()->orderBy('id')->take(3)->get();
        $grade = Grade::query()->orderBy('order')->first();

        if ($offerings->count() < 3) {
            return;
        }

        /** @var StudentService $studentService */
        $studentService = app(StudentService::class);

        $guardianOne = Guardian::query()->create([
            'full_name' => 'محمد أحمد',
            'civil_id' => '123456789012',
            'phone' => '0511111112',
            'phone_secondary' => '0511111113',
            'email' => 'mohammed.ahmed@example.com',
            'relationship' => GuardianRelationship::Father,
            'address' => 'حولي، الكويت',
        ]);

        $guardianTwo = Guardian::query()->create([
            'full_name' => 'يوسف خالد',
            'phone' => '0533333334',
            'relationship' => GuardianRelationship::Father,
        ]);

        $studentsData = [
            [
                'full_name' => 'أحمد محمد',
                'gender' => Gender::Male,
                'phone' => '0511111111',
                'guardian_id' => $guardianOne->id,
                'current_grade_id' => $grade?->id,
            ],
            [
                'full_name' => 'سارة محمد',
                'gender' => Gender::Female,
                'phone' => '0522222222',
                'guardian_id' => $guardianOne->id,
                'current_grade_id' => $grade?->id,
            ],
            [
                'full_name' => 'خالد يوسف',
                'gender' => Gender::Male,
                'phone' => '0533333333',
                'guardian_id' => $guardianTwo->id,
                'current_grade_id' => $grade?->id,
            ],
        ];

        foreach ($studentsData as $index => $data) {
            $student = $studentService->create($data);

            Enrollment::query()->create([
                'student_id' => $student->id,
                'class_offering_id' => $offerings[$index]->id,
                'status' => EnrollmentStatus::PendingPayment,
                'enrolled_at' => now(),
                'created_by' => $admin->id,
            ]);
        }
    }
}
