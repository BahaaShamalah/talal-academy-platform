<?php

namespace Database\Seeders;

use App\Enums\EvaluationLevelRating;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\ClassOffering;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class EvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $teacher = User::query()->where('email', 'teacher@example.com')->firstOrFail();

        $student = Student::query()->where('full_name', 'أحمد محمد')->firstOrFail();
        $offering = ClassOffering::query()->orderBy('id')->firstOrFail();

        $hasEnrollment = Enrollment::query()
            ->where('student_id', $student->id)
            ->where('class_offering_id', $offering->id)
            ->exists();

        if (! $hasEnrollment) {
            return;
        }

        Evaluation::query()->create([
            'student_id' => $student->id,
            'class_offering_id' => $offering->id,
            'class_session_id' => null,
            'numeric_score' => 8.5,
            'numeric_score_max' => 10,
            'level_rating' => null,
            'note' => 'أداء جيد في الاختبار القصير — يحتاج مراجعة الواجبات.',
            'created_by' => $teacher->id,
        ]);

        Evaluation::query()->create([
            'student_id' => $student->id,
            'class_offering_id' => $offering->id,
            'class_session_id' => null,
            'numeric_score' => null,
            'numeric_score_max' => 10,
            'level_rating' => EvaluationLevelRating::Good,
            'participation_rating' => 4,
            'understanding_rating' => 5,
            'homework_rating' => 3,
            'discipline_rating' => 4,
            'note' => null,
            'created_by' => $teacher->id,
        ]);
    }
}
