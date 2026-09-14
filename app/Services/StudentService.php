<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\QueryBuilder\Filters\StudentSearchFilter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class StudentService
{
    public function __construct(
        private readonly TeacherScopeService $teacherScopeService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Student>
     */
    public function list(Request $request, ?User $actor = null): LengthAwarePaginator
    {
        $baseQuery = Student::query();

        if ($actor && ! $this->teacherScopeService->bypassesScope($actor)) {
            $offeringIds = $this->teacherScopeService->teacherClassOfferingIds($actor);
            $baseQuery->whereHas('enrollments', function ($q) use ($offeringIds) {
                $q->where('status', \App\Enums\EnrollmentStatus::Active)
                    ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0]);
            });
        }

        return QueryBuilder::for($baseQuery)
            ->allowedFilters(
                AllowedFilter::custom('search', new StudentSearchFilter),
                AllowedFilter::exact('civil_id'),
                AllowedFilter::exact('file_number'),
                AllowedFilter::exact('current_grade_id'),
                AllowedFilter::exact('guardian_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('subject_id', function ($query, $value): void {
                    $query->whereHas(
                        'enrollments.classOffering',
                        fn ($q) => $q->where('subject_id', $value),
                    );
                }),
                AllowedFilter::callback('assigned', function ($query, $value): void {
                    if (in_array($value, ['1', 'true', 1, true], true)) {
                        $query->whereHas('enrollments');
                    } elseif (in_array($value, ['0', 'false', 0, false], true)) {
                        $query->whereDoesntHave('enrollments');
                    }
                }),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('guardian'),
                AllowedInclude::relationship('currentGrade'),
                AllowedInclude::relationship('currentGrade.educationalStage'),
                AllowedInclude::relationship('enrollments'),
                AllowedInclude::relationship('enrollments.classOffering'),
                AllowedInclude::relationship('enrollments.classOffering.subject'),
                AllowedInclude::relationship('enrollments.classOffering.grade'),
                AllowedInclude::relationship('enrollments.classOffering.gradeSection'),
                AllowedInclude::relationship('planSubscriptions'),
                AllowedInclude::relationship('planSubscriptions.plan'),
                AllowedInclude::relationship('planSubscriptions.plan.subject'),
                AllowedInclude::relationship('planSubscriptions.plan.productType'),
                AllowedInclude::relationship('planSubscriptions.plan.durationPeriod'),
                AllowedInclude::relationship('planSubscriptions.invoice'),
                AllowedInclude::relationship('planSubscriptions.selectedSubjects'),
                AllowedInclude::relationship('planSubscriptions.selectedSubjects.subject'),
                AllowedInclude::relationship('invoices'),
            )
            ->withCount('enrollments')
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Student
    {
        return DB::transaction(function () use ($data) {
            $guardianData = $data['guardian'] ?? null;
            unset($data['guardian'], $data['file_number'], $data['nationality']);

            if (! empty($guardianData)) {
                $guardian = Guardian::query()->create($guardianData);
                $data['guardian_id'] = $guardian->id;
                $data['phone'] = $guardian->phone;
            } elseif (! empty($data['guardian_id'])) {
                $guardian = Guardian::query()->find($data['guardian_id']);
                if ($guardian) {
                    $data['phone'] = $guardian->phone;
                }
            }

            $data['file_number'] = $this->generateFileNumber();

            return Student::query()
                ->create($data)
                ->load(['guardian', 'currentGrade.educationalStage'])
                ->loadCount('enrollments');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Student $student, array $data): Student
    {
        unset($data['guardian'], $data['file_number'], $data['nationality']);

        if (array_key_exists('guardian_id', $data) && $data['guardian_id']) {
            $guardian = Guardian::query()->find($data['guardian_id']);
            if ($guardian) {
                $data['phone'] = $guardian->phone;
            }
        }

        $student->update($data);

        return $student->refresh()
            ->load(['guardian', 'currentGrade.educationalStage'])
            ->loadCount('enrollments');
    }

    public function delete(Student $student): void
    {
        $student->delete();
    }

    private function generateFileNumber(): string
    {
        $yearSuffix = now()->format('y');

        $maxSequence = Student::query()
            ->lockForUpdate()
            ->pluck('file_number')
            ->map(function (?string $fileNumber) {
                if ($fileNumber === null || ! preg_match('/^TA-(\d{6})-\d{2}$/', $fileNumber, $matches)) {
                    return 0;
                }

                return (int) $matches[1];
            })
            ->max() ?? 0;

        return sprintf('TA-%06d-%s', $maxSequence + 1, $yearSuffix);
    }
}
