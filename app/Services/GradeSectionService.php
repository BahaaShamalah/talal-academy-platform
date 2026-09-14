<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\GradeSection;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class GradeSectionService
{
    /**
     * @return LengthAwarePaginator<int, GradeSection>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(GradeSection::class)
            ->allowedFilters(
                AllowedFilter::exact('grade_id'),
                AllowedFilter::exact('period_id'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('status'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('grade.educationalStage'),
                AllowedInclude::relationship('period'),
            )
            ->withCount('classOfferings')
            ->defaultSort('name')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): GradeSection
    {
        $this->assertUniqueName($data);

        return GradeSection::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(GradeSection $section, array $data): GradeSection
    {
        $this->assertUniqueName(array_merge($section->only([
            'grade_id',
            'period_id',
            'name',
            'gender',
        ]), $data), $section->id);

        $section->update($data);

        return $section->refresh();
    }

    public function delete(GradeSection $section): void
    {
        if ($section->classOfferings()->exists()) {
            throw ValidationException::withMessages([
                'grade_section' => ['لا يمكن حذف شعبة مرتبطة بجداول. احذف أو انقل الجداول أولاً.'],
            ]);
        }

        $section->delete();
    }

    /**
     * Resolve section by id or create/match by name for bulk import.
     *
     * @param  array<string, mixed>  $row
     */
    public function resolveForImport(array $row, ?int $periodId): ?int
    {
        if (! empty($row['grade_section_id'])) {
            $sectionId = (int) $row['grade_section_id'];
            $exists = GradeSection::query()
                ->whereKey($sectionId)
                ->where('grade_id', (int) $row['grade_id'])
                ->exists();

            if (! $exists) {
                throw ValidationException::withMessages([
                    'grade_section_id' => ['الشعبة المحددة لا تتبع هذا الصف.'],
                ]);
            }

            return $sectionId;
        }

        $name = trim((string) ($row['grade_section_name'] ?? ''));
        if ($name === '') {
            return null;
        }

        $gender = $row['gender'] ?? null;

        $existing = GradeSection::query()
            ->where('grade_id', (int) $row['grade_id'])
            ->where('name', $name)
            ->when(
                $periodId,
                fn ($q) => $q->where('period_id', $periodId),
                fn ($q) => $q->whereNull('period_id'),
            )
            ->when(
                $gender !== null && $gender !== '',
                fn ($q) => $q->where('gender', $gender),
                fn ($q) => $q->whereNull('gender'),
            )
            ->first();

        if ($existing) {
            return $existing->id;
        }

        $section = $this->create([
            'grade_id' => (int) $row['grade_id'],
            'period_id' => $periodId,
            'name' => $name,
            'gender' => $gender,
            'status' => 'active',
        ]);

        return $section->id;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertUniqueName(array $data, ?int $ignoreId = null): void
    {
        $query = GradeSection::query()
            ->where('grade_id', (int) $data['grade_id'])
            ->where('name', $data['name']);

        if (! empty($data['period_id'])) {
            $query->where('period_id', (int) $data['period_id']);
        } else {
            $query->whereNull('period_id');
        }

        if (array_key_exists('gender', $data) && $data['gender'] !== null && $data['gender'] !== '') {
            $query->where('gender', $data['gender']);
        } else {
            $query->whereNull('gender');
        }

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => ['يوجد شعبة بنفس الاسم لهذا الصف والفترة.'],
            ]);
        }
    }

    /**
     * Active students enrolled in any offering of this section.
     *
     * @return Collection<int, Student>
     */
    public function students(GradeSection $section): Collection
    {
        return Student::query()
            ->where('status', \App\Enums\StudentStatus::Active)
            ->whereHas('enrollments', function ($q) use ($section): void {
                $q->where('status', EnrollmentStatus::Active)
                    ->whereHas('classOffering', function ($co) use ($section): void {
                        $co->where('grade_section_id', $section->id);
                    });
            })
            ->orderBy('full_name')
            ->get();
    }
}
