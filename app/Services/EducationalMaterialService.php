<?php

namespace App\Services;

use App\Enums\EducationalMaterialScope;
use App\Enums\EnrollmentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\ClassOffering;
use App\Models\EducationalMaterial;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class EducationalMaterialService
{
    public function __construct(
        private readonly AutoEnrollmentService $autoEnrollmentService,
        private readonly TeacherScopeService $teacherScopeService,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, EducationalMaterial>
     */
    public function list(Request $request, ?User $actor = null): LengthAwarePaginator
    {
        $query = QueryBuilder::for(EducationalMaterial::class);

        if ($actor && ! $this->teacherScopeService->bypassesScope($actor)) {
            $offeringIds = $this->teacherScopeService->teacherClassOfferingIds($actor);
            $offerings = ClassOffering::query()
                ->whereIn('id', $offeringIds !== [] ? $offeringIds : [0])
                ->get();

            $subjectIds = $offerings->pluck('subject_id')->unique()->filter()->values()->all();
            $gradeIds = $offerings->pluck('grade_id')->unique()->filter()->values()->all();

            $query->where(function ($q) use ($subjectIds, $gradeIds, $actor) {
                $q->where(function ($general) use ($subjectIds, $gradeIds) {
                    $general->where('scope', EducationalMaterialScope::General)
                        ->whereIn('subject_id', $subjectIds !== [] ? $subjectIds : [0])
                        ->whereIn('grade_id', $gradeIds !== [] ? $gradeIds : [0]);
                })->orWhere(function ($targeted) use ($actor) {
                    $targeted->where('scope', EducationalMaterialScope::Targeted)
                        ->whereHas('student.enrollments', function ($enrollment) use ($actor) {
                            $offeringIds = $this->teacherScopeService->teacherClassOfferingIds($actor);
                            $enrollment->where('status', EnrollmentStatus::Active)
                                ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0]);
                        });
                });
            });
        }

        return $query
            ->allowedFilters(
                AllowedFilter::exact('scope'),
                AllowedFilter::exact('grade_id'),
                AllowedFilter::exact('subject_id'),
                AllowedFilter::exact('student_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('media'),
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('subject'),
                AllowedInclude::relationship('student'),
                AllowedInclude::relationship('period'),
                AllowedInclude::relationship('uploader'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * Materials visible to a student in a given academic period.
     *
     * @return Collection<int, EducationalMaterial>
     */
    public function getVisibleMaterials(Student $student, int $periodId): Collection
    {
        $subscriptions = StudentPlanSubscription::query()
            ->where('student_id', $student->id)
            ->where('period_id', $periodId)
            ->where('status', SubscriptionStatus::Active)
            ->with(['plan.grade', 'plan.educationalStage', 'plan.subject', 'plan.productType', 'selectedSubjects.subject', 'student.currentGrade'])
            ->get();

        $coveredSubjectIds = collect();
        $gradeIds = collect();

        foreach ($subscriptions as $subscription) {
            $gradeId = $subscription->plan?->resolveGradeIdForStudent($student)
                ?? ($subscription->plan?->grade_id ? (int) $subscription->plan->grade_id : null);
            if ($gradeId) {
                $gradeIds->push($gradeId);
            }

            foreach ($this->autoEnrollmentService->getCoveredSubjects($subscription) as $subject) {
                $coveredSubjectIds->push((int) $subject->id);
            }
        }

        $coveredSubjectIds = $coveredSubjectIds->unique()->values();
        $gradeIds = $gradeIds->unique()->filter()->values();

        $general = collect();

        if ($gradeIds->isNotEmpty() && $coveredSubjectIds->isNotEmpty()) {
            $general = EducationalMaterial::query()
                ->where('period_id', $periodId)
                ->where('scope', EducationalMaterialScope::General)
                ->whereIn('grade_id', $gradeIds)
                ->whereIn('subject_id', $coveredSubjectIds)
                ->with(['media', 'grade', 'subject', 'period'])
                ->get();
        }

        $targeted = EducationalMaterial::query()
            ->where('period_id', $periodId)
            ->where('scope', EducationalMaterialScope::Targeted)
            ->where('student_id', $student->id)
            ->with(['media', 'grade', 'subject', 'period', 'student'])
            ->get();

        return $general
            ->merge($targeted)
            ->unique('id')
            ->sortByDesc('created_at')
            ->values();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $uploadedBy): EducationalMaterial
    {
        $this->validateScopeFields($data);

        $scope = $data['scope'] instanceof EducationalMaterialScope
            ? $data['scope']
            : EducationalMaterialScope::from((string) $data['scope']);

        if ($scope === EducationalMaterialScope::General) {
            $this->teacherScopeService->assertCanUploadGeneralMaterial(
                $uploadedBy,
                (int) $data['grade_id'],
                (int) $data['subject_id'],
            );
        } else {
            $this->teacherScopeService->assertStudentInRoster($uploadedBy, (int) $data['student_id']);
        }

        $material = EducationalMaterial::query()->create([
            ...$data,
            'uploaded_by' => $uploadedBy->id,
        ]);

        $this->notifyGuardiansOfMaterial($material);

        return $material;
    }

    private function notifyGuardiansOfMaterial(EducationalMaterial $material): void
    {
        $material->loadMissing(['subject']);

        if ($material->scope === EducationalMaterialScope::Targeted || ($material->student_id ?? null)) {
            $student = Student::query()->with('guardian')->find($material->student_id);
            if ($student) {
                $this->notificationService->notifyStudentGuardian($student, 'educational_material_published', [
                    'title' => $material->title,
                ]);
            }

            return;
        }

        $gradeId = (int) ($material->grade_id ?? 0);
        $subjectId = (int) ($material->subject_id ?? 0);
        if ($gradeId <= 0) {
            return;
        }

        $students = Student::query()
            ->where('current_grade_id', $gradeId)
            ->whereNotNull('guardian_id')
            ->when($subjectId > 0, function ($q) use ($subjectId) {
                $q->where(function ($inner) use ($subjectId) {
                    $inner->whereHas('enrollments', function ($en) use ($subjectId) {
                        $en->where('status', EnrollmentStatus::Active)
                            ->whereHas('classOffering', fn ($co) => $co->where('subject_id', $subjectId));
                    })->orWhereHas('planSubscriptions', function ($sub) use ($subjectId) {
                        $sub->whereIn('status', [
                            SubscriptionStatus::Active,
                            SubscriptionStatus::PendingPayment,
                        ])->where(function ($s) use ($subjectId) {
                            $s->whereHas('plan', fn ($p) => $p->where('subject_id', $subjectId))
                                ->orWhereHas('selectedSubjects', fn ($ss) => $ss->where('subject_id', $subjectId));
                        });
                    });
                });
            })
            ->with('guardian')
            ->limit(200)
            ->get();

        foreach ($students as $student) {
            $this->notificationService->notifyStudentGuardian($student, 'educational_material_published', [
                'title' => $material->title,
            ]);
        }
    }

    public function delete(EducationalMaterial $material): void
    {
        $material->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateScopeFields(array $data): void
    {
        $scope = $data['scope'] instanceof EducationalMaterialScope
            ? $data['scope']
            : EducationalMaterialScope::from((string) $data['scope']);

        if ($scope === EducationalMaterialScope::General) {
            if (empty($data['grade_id']) || empty($data['subject_id'])) {
                throw ValidationException::withMessages([
                    'scope' => ['المادة العامة تتطلب تحديد الصف والمادة.'],
                ])->status(422);
            }

            if (! empty($data['student_id'])) {
                throw ValidationException::withMessages([
                    'student_id' => ['المادة العامة لا ترتبط بطالب محدد.'],
                ])->status(422);
            }

            return;
        }

        if (empty($data['student_id'])) {
            throw ValidationException::withMessages([
                'student_id' => ['المادة الخاصة تتطلب تحديد الطالب.'],
            ])->status(422);
        }
    }
}
