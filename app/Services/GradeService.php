<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Subject;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class GradeService
{
    /**
     * @return LengthAwarePaginator<int, Grade>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Grade::class)
            ->allowedFilters(
                AllowedFilter::exact('educational_stage_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('educationalStage'),
                AllowedInclude::relationship('subjects'),
            )
            ->withCount('subjects')
            ->defaultSort('order')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Grade
    {
        return Grade::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Grade $grade, array $data): Grade
    {
        $grade->update($data);

        return $grade->refresh();
    }

    public function delete(Grade $grade): void
    {
        if ($grade->classOfferings()->exists()) {
            throw ValidationException::withMessages([
                'grade' => ['لا يمكن حذف صف مرتبط بجداول. احذف الجداول أولاً.'],
            ]);
        }

        if ($grade->plans()->exists()) {
            throw ValidationException::withMessages([
                'grade' => ['لا يمكن حذف صف مرتبط بباقات. احذف الباقات أولاً.'],
            ]);
        }

        $grade->delete();
    }

    public function attachSubject(Grade $grade, Subject $subject): void
    {
        $grade->subjects()->syncWithoutDetaching([$subject->id]);
    }

    public function detachSubject(Grade $grade, Subject $subject): void
    {
        $linkedToOffering = $grade->classOfferings()
            ->where('subject_id', $subject->id)
            ->exists();

        if ($linkedToOffering) {
            throw ValidationException::withMessages([
                'subject' => ['لا يمكن فك ربط مادة مرتبطة بجداول لهذا الصف.'],
            ]);
        }

        $grade->subjects()->detach($subject->id);
    }
}
