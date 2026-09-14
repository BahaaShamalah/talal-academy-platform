<?php

namespace App\Services;

use App\Enums\ClassOfferingStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\SubjectSelectionMode;
use App\Enums\SubscriptionStatus;
use App\Models\ClassOffering;
use App\Models\ClassSchedule;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Plan;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Models\Subject;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AutoEnrollmentService
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
    ) {}

    public function enrollAfterActivation(StudentPlanSubscription $subscription): void
    {
        $subscription->loadMissing([
            'student.currentGrade',
            'plan.grade.subjects',
            'plan.educationalStage',
            'plan.subject',
            'plan.productType',
            'selectedSubjects.subject',
            'invoice',
        ]);

        if ($subscription->status === SubscriptionStatus::Frozen) {
            return;
        }

        if ($subscription->plan?->productType && ! $subscription->plan->productType->is_schedulable) {
            return;
        }

        $gradeId = $subscription->plan?->resolveGradeIdForStudent($subscription->student);
        if (! $gradeId) {
            return;
        }

        /** @var Collection<int, ClassOffering> $placedThisRun */
        $placedThisRun = collect();
        $studentGender = $subscription->student?->gender;

        foreach ($this->getCoveredSubjects($subscription) as $subject) {
            if (! $studentGender instanceof Gender) {
                continue;
            }

            $candidates = $this->matchingOfferingsForSubject(
                subjectId: (int) $subject->id,
                gradeId: $gradeId,
                periodId: $subscription->period_id ? (int) $subscription->period_id : null,
                studentGender: $studentGender,
            );

            if ($candidates->isEmpty()) {
                if ($this->hasGenderMismatchedOfferings(
                    subjectId: (int) $subject->id,
                    gradeId: $gradeId,
                    periodId: $subscription->period_id ? (int) $subscription->period_id : null,
                    studentGender: $studentGender,
                )) {
                    Log::info('auto_enrollment.skipped_gender_mismatch', [
                        'reason' => 'gender_mismatch',
                        'student_id' => $subscription->student_id,
                        'student_gender' => $studentGender->value,
                        'subscription_id' => $subscription->id,
                        'subject_id' => $subject->id,
                        'subject_name' => $subject->name,
                        'note' => 'لا يوجد جدول مطابق لجنس الطالب لهذه المادة — يبقى بانتظار جدول مناسب',
                    ]);
                }

                continue;
            }

            // Each offering is typically one weekday slot. A full week is several
            // offerings of the same subject in the same grade section.
            $lockedSectionId = $this->preferredGradeSectionId((int) $subscription->student_id)
                ?? $placedThisRun
                    ->pluck('grade_section_id')
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->first();

            if ($lockedSectionId) {
                $inSection = $candidates->filter(
                    fn (ClassOffering $o) => (int) $o->grade_section_id === $lockedSectionId,
                );
                if ($inSection->isNotEmpty()) {
                    $candidates = $inSection->values();
                }
            }

            $otherSubjectSchedules = $placedThisRun
                ->filter(fn (ClassOffering $o) => (int) $o->subject_id !== (int) $subject->id)
                ->flatMap(fn (ClassOffering $o) => $o->schedules ?? collect())
                ->values();

            $existingOther = $this->activeSchedulesForStudentExcludingSubject(
                (int) $subscription->student_id,
                (int) $subject->id,
            );
            $otherSubjectSchedules = $otherSubjectSchedules->concat($existingOther)->values();

            $anyPlaced = false;
            $allConflicted = true;

            foreach ($candidates as $candidate) {
                if ($this->studentHasActiveEnrollmentForOffering(
                    (int) $subscription->student_id,
                    (int) $candidate->id,
                )) {
                    $anyPlaced = true;
                    $allConflicted = false;
                    $placedThisRun->push($candidate);

                    continue;
                }

                if ($this->schedulesConflict($candidate->schedules, $otherSubjectSchedules)) {
                    continue;
                }

                $allConflicted = false;

                try {
                    $this->enrollmentService->create([
                        'student_id' => $subscription->student_id,
                        'class_offering_id' => $candidate->id,
                        'status' => EnrollmentStatus::Active->value,
                    ], $subscription->invoice?->created_by
                        ? (int) $subscription->invoice->created_by
                        : null, null);

                    $placedThisRun->push($candidate);
                    $anyPlaced = true;
                } catch (ConflictHttpException) {
                    // Duplicate enrollment — try next weekday slot.
                }
            }

            if ($anyPlaced) {
                continue;
            }

            if ($allConflicted && $candidates->isNotEmpty()) {
                Log::info('auto_enrollment.skipped_schedule_conflict', [
                    'reason' => 'schedule_conflict',
                    'student_id' => $subscription->student_id,
                    'subscription_id' => $subscription->id,
                    'subject_id' => $subject->id,
                    'subject_name' => $subject->name,
                    'candidate_class_offering_ids' => $candidates->pluck('id')->all(),
                    'note' => 'تعارض جدول مع مواد أخرى — الطالب يبقى بانتظار حل التعارض لهذه المادة',
                ]);
            }
        }
    }

    /**
     * Attempt to place students waiting due to schedule conflicts into this offering.
     */
    public function retryWaitingStudents(ClassOffering $offering): void
    {
        $offering->loadMissing(['schedules']);

        if ($offering->status !== ClassOfferingStatus::Active) {
            return;
        }

        $waiting = $this->waitingSubscriptionsForOffering($offering);

        foreach ($waiting as $subscription) {
            $subscription->loadMissing('student');

            if (! $offering->matchesStudentGender($subscription->student->gender)) {
                continue;
            }

            if ($this->studentHasActiveEnrollmentForOffering(
                (int) $subscription->student_id,
                (int) $offering->id,
            )) {
                continue;
            }

            $lockedSectionId = $this->preferredGradeSectionId((int) $subscription->student_id);
            if (
                $lockedSectionId
                && $offering->grade_section_id
                && (int) $offering->grade_section_id !== $lockedSectionId
            ) {
                continue;
            }

            $existingSchedules = $this->activeSchedulesForStudentExcludingSubject(
                (int) $subscription->student_id,
                (int) $offering->subject_id,
            );

            if ($this->schedulesConflict($offering->schedules, $existingSchedules)) {
                Log::info('auto_enrollment.retry_skipped_schedule_conflict', [
                    'reason' => 'schedule_conflict',
                    'student_id' => $subscription->student_id,
                    'subscription_id' => $subscription->id,
                    'class_offering_id' => $offering->id,
                    'subject_id' => $offering->subject_id,
                    'note' => 'تعارض جدول — يبقى بانتظار حل التعارض',
                ]);

                continue;
            }

            $createdBy = $subscription->invoice?->created_by
                ?? $subscription->loadMissing('invoice')->invoice?->created_by;

            try {
                $this->enrollmentService->create([
                    'student_id' => $subscription->student_id,
                    'class_offering_id' => $offering->id,
                    'status' => EnrollmentStatus::Active->value,
                ], $createdBy ? (int) $createdBy : null, null);
            } catch (ConflictHttpException) {
                // Duplicate enrollment — continue with next student.
            }
        }
    }

    /**
     * @return array{enrollments: Collection<int, Enrollment>, waiting: list<array<string, mixed>>}
     */
    public function scheduleForStudent(Student $student): array
    {
        $student->loadMissing([
            'enrollments' => fn ($q) => $q
                ->where('status', EnrollmentStatus::Active)
                ->with([
                    'classOffering.subject',
                    'classOffering.teacher',
                    'classOffering.hall.branch',
                    'classOffering.schedules',
                    'classOffering.grade',
                ]),
            'planSubscriptions' => fn ($q) => $q
                ->whereIn('status', [
                    SubscriptionStatus::Active,
                    SubscriptionStatus::PendingPayment,
                ])
                ->with(['plan.grade.subjects', 'plan.educationalStage', 'plan.subject', 'plan.productType', 'selectedSubjects.subject']),
        ]);

        $enrollments = $student->enrollments;
        $enrolledSubjectIds = $enrollments
            ->pluck('classOffering.subject_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $waiting = [];
        $seen = [];

        foreach ($student->planSubscriptions as $subscription) {
            if ($subscription->plan?->productType && ! $subscription->plan->productType->is_schedulable) {
                continue;
            }

            foreach ($this->getCoveredSubjects($subscription) as $subject) {
                if ($enrolledSubjectIds->contains((int) $subject->id)) {
                    continue;
                }

                $gradeId = $subscription->plan?->resolveGradeIdForStudent($student) ?? $subscription->plan?->grade_id;
                $key = ($subscription->period_id ?? 'none').'-'.($gradeId ?? 'none').'-'.$subject->id;
                if (isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;
                $waiting[] = [
                    'grade_id' => $gradeId,
                    'grade_name' => $subscription->plan->grade?->name
                        ?? $student->currentGrade?->name
                        ?? $subscription->plan->educationalStage?->name,
                    'subject_id' => $subject->id,
                    'subject_name' => $subject->name,
                    'plan_id' => $subscription->plan_id,
                    'plan_name' => $subscription->plan->name,
                    'period_id' => $subscription->period_id,
                ];
            }
        }

        return [
            'enrollments' => $enrollments,
            'waiting' => $waiting,
        ];
    }

    /**
     * Subjects covered by a subscription according to its product type.
     *
     * @return list<Subject>
     */
    public function getCoveredSubjects(StudentPlanSubscription $subscription): array
    {
        $subscription->loadMissing([
            'student.currentGrade.subjects',
            'plan.grade.subjects',
            'plan.educationalStage',
            'plan.subject',
            'plan.productType',
            'selectedSubjects.subject',
        ]);

        $plan = $subscription->plan;
        $mode = $plan?->productType?->subject_selection_mode;

        return match ($mode) {
            SubjectSelectionMode::AllSubjects => $this->allSubjectsForPlan($plan, $subscription->student),
            SubjectSelectionMode::SingleSubject => $plan->subject ? [$plan->subject] : [],
            SubjectSelectionMode::ChooseSubjects => $subscription->selectedSubjects
                ->map(fn ($row) => $row->subject)
                ->filter()
                ->values()
                ->all(),
            SubjectSelectionMode::None, null => [],
        };
    }

    /**
     * @return list<Subject>
     */
    private function allSubjectsForPlan(?Plan $plan, ?Student $student): array
    {
        if (! $plan) {
            return [];
        }

        if ($plan->grade_id) {
            $plan->loadMissing('grade.subjects');

            return $plan->grade?->subjects?->values()->all() ?? [];
        }

        $gradeId = $plan->resolveGradeIdForStudent($student);
        if (! $gradeId) {
            return [];
        }

        $student?->loadMissing('currentGrade.subjects');
        if ($student?->currentGrade && (int) $student->current_grade_id === $gradeId) {
            return $student->currentGrade->subjects?->values()->all() ?? [];
        }

        $grade = Grade::query()->with('subjects')->find($gradeId);

        return $grade?->subjects?->values()->all() ?? [];
    }

    /**
     * @return Collection<int, ClassOffering>
     */
    private function matchingOfferingsForSubject(
        int $subjectId,
        int $gradeId,
        ?int $periodId,
        Gender $studentGender,
    ): Collection {
        return ClassOffering::query()
            ->where('subject_id', $subjectId)
            ->where('grade_id', $gradeId)
            ->where('status', ClassOfferingStatus::Active)
            ->matchingStudentGender($studentGender)
            ->when($periodId, fn ($q) => $q->where('period_id', $periodId))
            ->with(['schedules'])
            ->orderBy('id')
            ->get();
    }

    private function hasGenderMismatchedOfferings(
        int $subjectId,
        int $gradeId,
        ?int $periodId,
        Gender $studentGender,
    ): bool {
        return ClassOffering::query()
            ->where('subject_id', $subjectId)
            ->where('grade_id', $gradeId)
            ->where('status', ClassOfferingStatus::Active)
            ->whereNotNull('gender')
            ->where('gender', '!=', $studentGender->value)
            ->when($periodId, fn ($q) => $q->where('period_id', $periodId))
            ->exists();
    }

    /**
     * @param  Collection<int, ClassSchedule>|iterable<ClassSchedule>  $left
     * @param  Collection<int, ClassSchedule>|iterable<ClassSchedule>  $right
     */
    private function schedulesConflict(iterable $left, iterable $right): bool
    {
        $left = collect($left);
        $right = collect($right);

        if ($left->isEmpty() || $right->isEmpty()) {
            return false;
        }

        foreach ($left as $a) {
            foreach ($right as $b) {
                if ((int) $a->day_of_week !== (int) $b->day_of_week) {
                    continue;
                }

                $aStart = $this->timeToMinutes((string) $a->start_time);
                $aEnd = $this->timeToMinutes((string) $a->end_time);
                $bStart = $this->timeToMinutes((string) $b->start_time);
                $bEnd = $this->timeToMinutes((string) $b->end_time);

                if ($aStart < $bEnd && $bStart < $aEnd) {
                    return true;
                }
            }
        }

        return false;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', substr($time, 0, 8));
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return ($h * 60) + $m;
    }

    /**
     * Active subscriptions waiting for this offering's subject, oldest first.
     *
     * @return Collection<int, StudentPlanSubscription>
     */
    private function waitingSubscriptionsForOffering(ClassOffering $offering): Collection
    {
        return StudentPlanSubscription::query()
            ->whereIn('status', [
                SubscriptionStatus::Active->value,
                SubscriptionStatus::PendingPayment->value,
            ])
            ->when(
                $offering->period_id,
                fn ($q) => $q->where('period_id', $offering->period_id),
            )
            ->with([
                'plan.grade.subjects',
                'plan.subject',
                'plan.productType',
                'selectedSubjects.subject',
                'invoice',
            ])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->filter(function (StudentPlanSubscription $subscription) use ($offering) {
                $subscription->loadMissing('student');

                if (! $offering->matchesStudentGender($subscription->student->gender)) {
                    return false;
                }

                if ((int) $subscription->plan?->grade_id !== (int) $offering->grade_id) {
                    return false;
                }

                if ($subscription->plan?->productType && ! $subscription->plan->productType->is_schedulable) {
                    return false;
                }

                $coveredIds = collect($this->getCoveredSubjects($subscription))
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id);

                if (! $coveredIds->contains((int) $offering->subject_id)) {
                    return false;
                }

                if ($this->studentHasActiveEnrollmentForOffering(
                    (int) $subscription->student_id,
                    (int) $offering->id,
                )) {
                    return false;
                }

                $lockedSectionId = $this->preferredGradeSectionId((int) $subscription->student_id);
                if (
                    $lockedSectionId
                    && $offering->grade_section_id
                    && (int) $offering->grade_section_id !== $lockedSectionId
                ) {
                    return false;
                }

                return true;
            })
            ->values();
    }

    private function studentHasActiveEnrollmentForOffering(int $studentId, int $classOfferingId): bool
    {
        return Enrollment::query()
            ->where('student_id', $studentId)
            ->where('class_offering_id', $classOfferingId)
            ->whereIn('status', [
                EnrollmentStatus::Active->value,
                EnrollmentStatus::PendingPayment->value,
            ])
            ->exists();
    }

    private function preferredGradeSectionId(int $studentId): ?int
    {
        $ids = Enrollment::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [
                EnrollmentStatus::Active->value,
                EnrollmentStatus::PendingPayment->value,
            ])
            ->with('classOffering:id,grade_section_id')
            ->get()
            ->pluck('classOffering.grade_section_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->countBy()
            ->sortDesc()
            ->keys();

        $first = $ids->first();

        return $first ? (int) $first : null;
    }

    /**
     * @return Collection<int, ClassSchedule>
     */
    private function activeSchedulesForStudentExcludingSubject(int $studentId, int $excludeSubjectId): Collection
    {
        return Enrollment::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [EnrollmentStatus::Active, EnrollmentStatus::PendingPayment])
            ->with('classOffering.schedules')
            ->get()
            ->filter(fn (Enrollment $e) => (int) $e->classOffering?->subject_id !== $excludeSubjectId)
            ->flatMap(fn (Enrollment $e) => $e->classOffering?->schedules ?? collect())
            ->values();
    }
}
