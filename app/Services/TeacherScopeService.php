<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Evaluation;
use App\Models\User;
use Illuminate\Support\Collection;

class TeacherScopeService
{
    public function bypassesScope(User $user): bool
    {
        // Only pure teachers are restricted; admin (and any non-teacher staff) see everything.
        if ($user->hasRole('admin')) {
            return true;
        }

        return ! $user->hasRole('teacher');
    }

    /**
     * @return list<int>
     */
    public function teacherClassOfferingIds(User $user): array
    {
        return ClassOffering::query()
            ->where('teacher_id', $user->id)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** @deprecated Use teacherClassOfferingIds */
    public function teacherGroupSubjectIds(User $user): array
    {
        return $this->teacherClassOfferingIds($user);
    }

    public function assertOwnsClassOffering(User $user, ClassOffering $offering): void
    {
        if ($this->bypassesScope($user)) {
            return;
        }

        if ((int) $offering->teacher_id !== (int) $user->id) {
            abort(403, 'غير مصرح بإدارة هذا الجدول.');
        }
    }

    /** @deprecated Use assertOwnsClassOffering */
    public function assertOwnsGroupSubject(User $user, ClassOffering $groupSubject): void
    {
        $this->assertOwnsClassOffering($user, $groupSubject);
    }

    public function assertOwnsSession(User $user, ClassSession $session): void
    {
        $session->loadMissing('classOffering');

        if (! $session->classOffering) {
            abort(403, 'غير مصرح بإدارة هذه الجلسة.');
        }

        $this->assertOwnsClassOffering($user, $session->classOffering);
    }

    public function assertOwnsExam(User $user, Exam $exam): void
    {
        $exam->loadMissing('classOffering');

        if (! $exam->classOffering) {
            abort(403, 'غير مصرح بإدارة هذا الاختبار.');
        }

        $this->assertOwnsClassOffering($user, $exam->classOffering);
    }

    public function assertOwnsEvaluationGroup(User $user, Evaluation $evaluation): void
    {
        $evaluation->loadMissing('classOffering');

        if (! $evaluation->classOffering) {
            abort(403, 'غير مصرح بإدارة هذا التقييم.');
        }

        $this->assertOwnsClassOffering($user, $evaluation->classOffering);
    }

    public function assertClassOfferingIdAccessible(User $user, int $classOfferingId): void
    {
        if ($this->bypassesScope($user)) {
            return;
        }

        $offering = ClassOffering::query()->find($classOfferingId);

        if (! $offering) {
            abort(404);
        }

        $this->assertOwnsClassOffering($user, $offering);
    }

    /** @deprecated Use assertClassOfferingIdAccessible */
    public function assertGroupSubjectIdAccessible(User $user, int $groupSubjectId): void
    {
        $this->assertClassOfferingIdAccessible($user, $groupSubjectId);
    }

    public function assertStudentInRoster(User $user, int $studentId): void
    {
        if ($this->bypassesScope($user)) {
            return;
        }

        $offeringIds = $this->teacherClassOfferingIds($user);

        $exists = Enrollment::query()
            ->where('student_id', $studentId)
            ->where('status', EnrollmentStatus::Active)
            ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0])
            ->exists();

        if (! $exists) {
            abort(403, 'غير مصرح بالوصول إلى هذا الطالب.');
        }
    }

    public function teachesSubjectGrade(User $user, int $subjectId, int $gradeId): bool
    {
        if ($this->bypassesScope($user)) {
            return true;
        }

        $viaOffering = ClassOffering::query()
            ->where('teacher_id', $user->id)
            ->where('subject_id', $subjectId)
            ->where('grade_id', $gradeId)
            ->exists();

        if ($viaOffering) {
            return true;
        }

        $profile = $user->staffProfile;

        if (! $profile) {
            return false;
        }

        return $profile->subjects()->where('subjects.id', $subjectId)->exists()
            && $profile->grades()->where('grades.id', $gradeId)->exists();
    }

    public function assertCanUploadGeneralMaterial(User $user, int $subjectId, int $gradeId): void
    {
        if ($this->teachesSubjectGrade($user, $subjectId, $gradeId)) {
            return;
        }

        abort(403, 'غير مصرح برفع مواد لهذا الصف/المادة.');
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Exam>|\Illuminate\Database\Eloquent\Builder<\App\Models\Evaluation>|\Illuminate\Database\Eloquent\Builder<\App\Models\EducationalMaterial>|\Illuminate\Database\Eloquent\Builder<\App\Models\Student>  $query
     */
    public function scopeToTeacherOfferings(User $user, $query, string $classOfferingColumn = 'class_offering_id'): void
    {
        if ($this->bypassesScope($user)) {
            return;
        }

        $ids = $this->teacherClassOfferingIds($user);
        $query->whereIn($classOfferingColumn, $ids !== [] ? $ids : [0]);
    }

    /**
     * @return Collection<int, ClassOffering>
     */
    public function ownedClassOfferings(User $user): Collection
    {
        return ClassOffering::query()
            ->where('teacher_id', $user->id)
            ->with([
                'subject',
                'teacher',
                'hall',
                'grade',
                'gradeSection',
                'period',
                'schedules',
            ])
            ->withCount([
                'enrollments as active_students_count' => fn ($q) => $q->where('status', EnrollmentStatus::Active),
            ])
            ->orderBy('id')
            ->get();
    }

    /** @deprecated Use ownedClassOfferings */
    public function ownedGroupSubjects(User $user): Collection
    {
        return $this->ownedClassOfferings($user);
    }
}
