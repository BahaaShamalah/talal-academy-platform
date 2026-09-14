<?php

namespace App\Services;

use App\Models\Subject;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubjectService
{
    /**
     * @return LengthAwarePaginator<int, Subject>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return Subject::query()
            ->withCount('grades')
            ->latest()
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Subject
    {
        return Subject::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Subject $subject, array $data): Subject
    {
        $subject->update($data);

        return $subject->refresh();
    }

    public function delete(Subject $subject): void
    {
        if ($subject->grades()->exists()) {
            throw ValidationException::withMessages([
                'subject' => ['لا يمكن حذف مادة مرتبطة بصفوف. افك الربط أولاً.'],
            ]);
        }

        if ($subject->classOfferings()->exists()) {
            throw ValidationException::withMessages([
                'subject' => ['لا يمكن حذف مادة مرتبطة بعروض شعب.'],
            ]);
        }

        if ($subject->plans()->exists()) {
            throw ValidationException::withMessages([
                'subject' => ['لا يمكن حذف مادة مرتبطة بباقات.'],
            ]);
        }

        $subject->delete();
    }
}
