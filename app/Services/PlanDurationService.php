<?php

namespace App\Services;

use App\Models\PlanDuration;
use App\Models\AcademicPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PlanDurationService
{
    /**
     * @return LengthAwarePaginator<int, PlanDuration>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return PlanDuration::query()
            ->orderByDesc('start_date')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    public function findOrCreateFromAcademicPeriod(AcademicPeriod $period): PlanDuration
    {
        $start = $period->start_date?->toDateString();
        $end = $period->end_date?->toDateString();

        $existing = PlanDuration::query()
            ->where('name', $period->name)
            ->whereDate('start_date', $start)
            ->whereDate('end_date', $end)
            ->first();

        if ($existing) {
            return $existing;
        }

        return PlanDuration::query()->create([
            'name' => $period->name,
            'start_date' => $start,
            'end_date' => $end,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): PlanDuration
    {
        $this->assertDateRange($data['start_date'], $data['end_date']);

        return PlanDuration::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PlanDuration $planDuration, array $data): PlanDuration
    {
        $start = $data['start_date'] ?? $planDuration->start_date?->toDateString();
        $end = $data['end_date'] ?? $planDuration->end_date?->toDateString();

        $this->assertDateRange((string) $start, (string) $end);

        $planDuration->update($data);

        return $planDuration->refresh();
    }

    public function delete(PlanDuration $planDuration): void
    {
        if ($planDuration->plans()->exists()) {
            throw ValidationException::withMessages([
                'plan_duration' => ['لا يمكن حذف مدة مرتبطة بباقات.'],
            ]);
        }

        $planDuration->delete();
    }

    private function assertDateRange(string $startDate, string $endDate): void
    {
        if ($endDate <= $startDate) {
            throw ValidationException::withMessages([
                'end_date' => ['تاريخ النهاية يجب أن يكون بعد تاريخ البداية.'],
            ]);
        }
    }
}
