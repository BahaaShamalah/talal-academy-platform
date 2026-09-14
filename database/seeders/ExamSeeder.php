<?php

namespace Database\Seeders;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\ClassOffering;
use App\Models\Student;
use App\Models\User;
use App\Services\AcademicPeriodService;
use App\Services\ExamService;
use Illuminate\Database\Seeder;

class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $offering = ClassOffering::query()->orderBy('id')->firstOrFail();
        $ahmed = Student::query()->where('full_name', 'أحمد محمد')->firstOrFail();
        $sara = Student::query()->where('full_name', 'سارة محمد')->firstOrFail();

        $hasActiveEnrollment = Enrollment::query()
            ->where('class_offering_id', $offering->id)
            ->where('status', EnrollmentStatus::Active)
            ->whereIn('student_id', [$ahmed->id, $sara->id])
            ->count() >= 2;

        if (! $hasActiveEnrollment) {
            return;
        }

        /** @var AcademicPeriodService $periodService */
        $periodService = app(AcademicPeriodService::class);
        $period = $periodService->currentActive();

        if (! $period) {
            return;
        }

        /** @var ExamService $examService */
        $examService = app(ExamService::class);

        $exam = Exam::query()->create([
            'name' => 'اختبار منتصف الفصل — رياضيات',
            'exam_date' => now()->subDays(3)->toDateString(),
            'class_offering_id' => $offering->id,
            'max_score' => 20,
            'period_id' => $period->id,
            'created_by' => $admin->id,
        ]);

        $examService->recordResults($exam, [
            [
                'student_id' => $ahmed->id,
                'score' => 17.5,
                'teacher_notes' => 'أداء ممتاز.',
            ],
            [
                'student_id' => $sara->id,
                'score' => null,
                'teacher_notes' => 'تغيّب عن الاختبار',
            ],
        ]);

        $ahmedResults = $examService->listForStudent($ahmed, request());
        $saraResults = $examService->listForStudent($sara, request());

        if ($ahmedResults->count() !== 1 || (float) $ahmedResults->first()->score != 17.5) {
            throw new \RuntimeException('Seeder check failed: أحمد يجب أن يرى نتيجته فقط');
        }

        if ($saraResults->count() !== 1 || $saraResults->first()->score !== null) {
            throw new \RuntimeException('Seeder check failed: سارة يجب أن ترى نتيجتها (بدون درجة)');
        }
    }
}
