<?php

namespace App\Services;

use App\Models\EducationalStage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EducationalStageService
{
    /**
     * @return LengthAwarePaginator<int, EducationalStage>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return EducationalStage::query()
            ->withCount('grades')
            ->orderBy('order')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): EducationalStage
    {
        return EducationalStage::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(EducationalStage $stage, array $data): EducationalStage
    {
        $stage->update($data);

        return $stage->refresh();
    }

    public function delete(EducationalStage $stage): void
    {
        if ($stage->grades()->exists()) {
            throw ValidationException::withMessages([
                'educational_stage' => ['لا يمكن حذف مرحلة مرتبطة بصفوف. احذف الصفوف أولاً.'],
            ]);
        }

        $stage->delete();
    }
}
