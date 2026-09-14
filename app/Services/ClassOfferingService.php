<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Models\ClassOffering;
use App\Models\GradeSection;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ClassOfferingService
{
    public function __construct(
        private readonly TeacherScopeService $teacherScope,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters = [], ?User $actor = null): LengthAwarePaginator
    {
        $query = ClassOffering::query()
            ->with(['grade', 'gradeSection', 'subject', 'teacher', 'hall', 'period', 'schedules'])
            ->withCount([
                'enrollments as active_students_count' => fn ($q) => $q->whereIn('status', [
                    EnrollmentStatus::Active,
                    EnrollmentStatus::PendingPayment,
                ]),
            ])
            ->orderBy('id');

        if ($actor && ! $this->teacherScope->bypassesScope($actor)) {
            $query->where('teacher_id', $actor->id);
        }

        if (! empty($filters['grade_id'])) {
            $query->where('grade_id', (int) $filters['grade_id']);
        } elseif (! empty($filters['filter']['grade_id'])) {
            $query->where('grade_id', (int) $filters['filter']['grade_id']);
        }

        if (! empty($filters['subject_id'])) {
            $query->where('subject_id', (int) $filters['subject_id']);
        } elseif (! empty($filters['filter']['subject_id'])) {
            $query->where('subject_id', (int) $filters['filter']['subject_id']);
        }

        if (! empty($filters['teacher_id'])) {
            $query->where('teacher_id', (int) $filters['teacher_id']);
        } elseif (! empty($filters['filter']['teacher_id'])) {
            $query->where('teacher_id', (int) $filters['filter']['teacher_id']);
        }

        if (! empty($filters['period_id'])) {
            $query->where('period_id', (int) $filters['period_id']);
        } elseif (! empty($filters['filter']['period_id'])) {
            $query->where('period_id', (int) $filters['filter']['period_id']);
        }

        $sectionFilter = $filters['grade_section_id']
            ?? $filters['filter']['grade_section_id']
            ?? null;
        if ($sectionFilter !== null && $sectionFilter !== '') {
            if ($sectionFilter === 'none' || $sectionFilter === 'null') {
                $query->whereNull('grade_section_id');
            } else {
                $query->where('grade_section_id', (int) $sectionFilter);
            }
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        } elseif (! empty($filters['filter']['status'])) {
            $query->where('status', $filters['filter']['status']);
        }

        $gender = $filters['gender'] ?? $filters['filter']['gender'] ?? null;
        if (! empty($gender) && in_array($gender, ['male', 'female'], true)) {
            $query->where('gender', $gender);
        }

        return $query->paginate((int) ($filters['per_page'] ?? 50));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ClassOffering
    {
        $this->assertGradeSubjectLink((int) $data['grade_id'], (int) $data['subject_id']);
        $this->assertGradeSectionLink($data);

        $offering = ClassOffering::query()->create($data);

        $this->autoEnrollment()->retryWaitingStudents($offering->fresh(['schedules']));

        return $offering->refresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClassOffering $offering, array $data): ClassOffering
    {
        $gradeId = (int) ($data['grade_id'] ?? $offering->grade_id);
        $subjectId = (int) ($data['subject_id'] ?? $offering->subject_id);
        $this->assertGradeSubjectLink($gradeId, $subjectId);
        $this->assertGradeSectionLink(array_merge($offering->only(['grade_id', 'grade_section_id']), $data));

        $offering->update($data);
        $offering = $offering->refresh();

        if (array_key_exists('gender', $data)) {
            $this->autoEnrollment()->retryWaitingStudents($offering->loadMissing('schedules'));
        }

        return $offering;
    }

    public function delete(ClassOffering $offering): void
    {
        $activeCount = $offering->enrollments()
            ->whereIn('status', [
                EnrollmentStatus::Active,
                EnrollmentStatus::PendingPayment,
            ])
            ->count();

        if ($activeCount > 0) {
            throw new ConflictHttpException(
                "لا يمكن حذف هذا الجدول: {$activeCount} طالب مسجّل حالياً."
            );
        }

        $offering->delete();
    }

    private function assertGradeSubjectLink(int $gradeId, int $subjectId): void
    {
        $linked = DB::table('grade_subjects')
            ->where('grade_id', $gradeId)
            ->where('subject_id', $subjectId)
            ->exists();

        if (! $linked) {
            throw ValidationException::withMessages([
                'subject_id' => ['لا يمكن إنشاء الجدول: المادة غير مرتبطة بهذه المرحلة.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertGradeSectionLink(array $data): void
    {
        if (empty($data['grade_section_id'])) {
            return;
        }

        $gradeId = (int) ($data['grade_id'] ?? 0);
        $section = GradeSection::query()->find((int) $data['grade_section_id']);

        if (! $section || ($gradeId > 0 && (int) $section->grade_id !== $gradeId)) {
            throw ValidationException::withMessages([
                'grade_section_id' => ['الشعبة المحددة لا تتبع هذا الصف.'],
            ]);
        }

        if ($section->gender !== null && ! empty($data['gender'])) {
            $offeringGender = $data['gender'] instanceof Gender
                ? $data['gender']->value
                : (string) $data['gender'];

            if ($section->gender->value !== $offeringGender) {
                throw ValidationException::withMessages([
                    'grade_section_id' => [
                        'جنس الشعبة لا يطابق جنس الجدول — اختر شعبة '.$this->genderLabel($offeringGender).' أو أنشئ شعبة جديدة.',
                    ],
                ]);
            }
        }
    }

    private function genderLabel(string $gender): string
    {
        return match ($gender) {
            'male' => 'للذكور',
            'female' => 'للإناث',
            default => '',
        };
    }

    private function autoEnrollment(): AutoEnrollmentService
    {
        return app(AutoEnrollmentService::class);
    }
}
