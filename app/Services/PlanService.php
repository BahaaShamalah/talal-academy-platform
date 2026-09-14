<?php

namespace App\Services;

use App\Enums\PlanDurationType;
use App\Enums\SubjectSelectionMode;
use App\Models\AcademicPeriod;
use App\Models\Plan;
use App\Models\ProductType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class PlanService
{
    public function __construct(
        private readonly AcademicPeriodService $academicPeriodService,
        private readonly PlanDurationService $planDurationService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Plan>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Plan::class)
            ->allowedFilters(
                AllowedFilter::callback('grade_id', function ($query, $value) {
                    $gradeId = (int) $value;
                    $query->where(function ($q) use ($gradeId) {
                        $q->where('grade_id', $gradeId)
                            ->orWhereHas(
                                'educationalStage.grades',
                                fn ($gq) => $gq->where('grades.id', $gradeId),
                            );
                    });
                }),
                AllowedFilter::exact('educational_stage_id'),
                AllowedFilter::exact('subject_id'),
                AllowedFilter::exact('product_type_id'),
                AllowedFilter::exact('period_id'),
                AllowedFilter::exact('duration_type'),
                AllowedFilter::exact('is_active'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('educationalStage'),
                AllowedInclude::relationship('subject'),
                AllowedInclude::relationship('period'),
                AllowedInclude::relationship('durationPeriod'),
                AllowedInclude::relationship('productType'),
                AllowedInclude::relationship('installmentTemplate'),
            )
            ->defaultSort('-created_at')
            ->with(['period', 'durationPeriod', 'productType', 'educationalStage'])
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Plan
    {
        unset($data['period_id'], $data['semester_id']);
        $data = $this->normalizeFields($data);

        $this->assertGradeSubjectLink(
            isset($data['grade_id']) ? (int) $data['grade_id'] : null,
            isset($data['subject_id']) ? (int) $data['subject_id'] : null,
            isset($data['educational_stage_id']) ? (int) $data['educational_stage_id'] : null,
        );

        $activePeriod = $this->academicPeriodService->currentActive();

        if (! $activePeriod) {
            throw ValidationException::withMessages([
                'period' => ['لا توجد فترة دراسية نشطة حاليًا، فعّل فترة أولًا من صفحة الفترات الدراسية'],
            ]);
        }

        $data['period_id'] = $activePeriod->id;

        return Plan::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Plan $plan, array $data): Plan
    {
        unset($data['period_id'], $data['semester_id']);
        $data = $this->normalizeFields($data, $plan);

        $gradeId = array_key_exists('grade_id', $data) ? $data['grade_id'] : $plan->grade_id;
        $stageId = array_key_exists('educational_stage_id', $data)
            ? $data['educational_stage_id']
            : $plan->educational_stage_id;
        $subjectId = array_key_exists('subject_id', $data) ? $data['subject_id'] : $plan->subject_id;

        $this->assertGradeSubjectLink(
            $gradeId !== null ? (int) $gradeId : null,
            $subjectId !== null ? (int) $subjectId : null,
            $stageId !== null ? (int) $stageId : null,
        );

        $plan->update($data);

        return $plan->refresh();
    }

    public function delete(Plan $plan): void
    {
        $plan->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeFields(array $data, ?Plan $existing = null): array
    {
        if (! empty($data['duration_academic_period_id'])) {
            $academicPeriod = AcademicPeriod::query()->find($data['duration_academic_period_id']);

            if (! $academicPeriod) {
                throw ValidationException::withMessages([
                    'duration_academic_period_id' => ['الفترة الدراسية غير موجودة.'],
                ]);
            }

            $data['duration_type'] = PlanDurationType::FixedPeriod->value;
            $data['duration_period_id'] = $this->planDurationService
                ->findOrCreateFromAcademicPeriod($academicPeriod)
                ->id;
        }

        unset($data['duration_academic_period_id']);

        $type = $data['duration_type'] ?? $existing?->duration_type?->value;

        if ($type === PlanDurationType::MonthlyRecurring->value) {
            $data['duration_period_id'] = null;
        }

        $productTypeId = $data['product_type_id'] ?? $existing?->product_type_id;
        $productType = $productTypeId
            ? ProductType::query()->find($productTypeId)
            : null;

        if ($productType) {
            $mode = $productType->subject_selection_mode;

            if ($mode !== SubjectSelectionMode::SingleSubject) {
                $data['subject_id'] = null;
            }

            if ($mode !== SubjectSelectionMode::ChooseSubjects) {
                $data['subject_selection_count'] = null;
            }

            if (! $productType->requires_grade) {
                if (! array_key_exists('grade_id', $data) && ! $existing) {
                    $data['grade_id'] = null;
                }
                if (! array_key_exists('educational_stage_id', $data) && ! $existing) {
                    $data['educational_stage_id'] = null;
                }
            }

            // صف محدد ومرحلة كاملة متنافيان
            if (array_key_exists('educational_stage_id', $data) && ! empty($data['educational_stage_id'])) {
                $data['grade_id'] = null;
            }
            if (array_key_exists('grade_id', $data) && ! empty($data['grade_id'])) {
                $data['educational_stage_id'] = null;
            }
        }

        return $data;
    }

    private function assertGradeSubjectLink(?int $gradeId, ?int $subjectId, ?int $stageId = null): void
    {
        if ($subjectId === null) {
            return;
        }

        if ($gradeId !== null) {
            $linked = DB::table('grade_subjects')
                ->where('grade_id', $gradeId)
                ->where('subject_id', $subjectId)
                ->exists();

            if (! $linked) {
                throw ValidationException::withMessages([
                    'subject_id' => ['هذه المادة غير مرتبطة بالصف المحدد.'],
                ]);
            }

            return;
        }

        if ($stageId !== null) {
            $linked = DB::table('grade_subjects')
                ->join('grades', 'grades.id', '=', 'grade_subjects.grade_id')
                ->where('grades.educational_stage_id', $stageId)
                ->where('grade_subjects.subject_id', $subjectId)
                ->exists();

            if (! $linked) {
                throw ValidationException::withMessages([
                    'subject_id' => ['هذه المادة غير مرتبطة بأي صف ضمن المرحلة المحددة.'],
                ]);
            }
        }
    }
}
