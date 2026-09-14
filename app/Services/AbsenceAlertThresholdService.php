<?php

namespace App\Services;

use App\Models\AbsenceAlertThreshold;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AbsenceAlertThresholdService
{
    /**
     * @return LengthAwarePaginator<int, AbsenceAlertThreshold>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return AbsenceAlertThreshold::query()
            ->orderBy('consecutive_absences_count')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): AbsenceAlertThreshold
    {
        return AbsenceAlertThreshold::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(AbsenceAlertThreshold $threshold, array $data): AbsenceAlertThreshold
    {
        if (isset($data['consecutive_absences_count'])
            && (int) $data['consecutive_absences_count'] !== (int) $threshold->consecutive_absences_count) {
            $duplicate = AbsenceAlertThreshold::query()
                ->where('consecutive_absences_count', $data['consecutive_absences_count'])
                ->whereKeyNot($threshold->id)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'consecutive_absences_count' => ['يوجد عتبة أخرى بنفس عدد الغيابات المتتالية.'],
                ])->status(422);
            }
        }

        $threshold->update($data);

        return $threshold->refresh();
    }

    public function delete(AbsenceAlertThreshold $threshold): void
    {
        $threshold->delete();
    }
}
