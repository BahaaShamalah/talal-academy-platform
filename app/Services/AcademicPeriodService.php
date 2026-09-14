<?php

namespace App\Services;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class AcademicPeriodService
{
    /**
     * Ordered lifecycle: each step may only advance to the next.
     *
     * @var list<AcademicPeriodStatus>
     */
    private const LIFECYCLE = [
        AcademicPeriodStatus::Draft,
        AcademicPeriodStatus::RegistrationOpen,
        AcademicPeriodStatus::Active,
        AcademicPeriodStatus::Closed,
        AcademicPeriodStatus::Archived,
    ];

    /**
     * @return LengthAwarePaginator<int, AcademicPeriod>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(AcademicPeriod::class)
            ->allowedFilters(
                AllowedFilter::exact('status'),
            )
            ->defaultSort('-start_date')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): AcademicPeriod
    {
        $data['status'] = $data['status'] ?? AcademicPeriodStatus::Draft->value;

        return AcademicPeriod::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(AcademicPeriod $period, array $data): AcademicPeriod
    {
        unset($data['status']);

        $period->update($data);

        return $period->refresh();
    }

    public function delete(AcademicPeriod $period): void
    {
        $period->delete();
    }

    public function activate(AcademicPeriod $period): AcademicPeriod
    {
        return DB::transaction(function () use ($period) {
            $period = AcademicPeriod::query()->lockForUpdate()->findOrFail($period->id);

            if ($period->status === AcademicPeriodStatus::Active) {
                return $period;
            }

            if (in_array($period->status, [AcademicPeriodStatus::Closed, AcademicPeriodStatus::Archived], true)) {
                throw ValidationException::withMessages([
                    'status' => [sprintf(
                        'لا يمكن تفعيل فترة بحالة «%s».',
                        $period->status->label(),
                    )],
                ]);
            }

            AcademicPeriod::query()
                ->where('status', AcademicPeriodStatus::Active)
                ->whereKeyNot($period->id)
                ->update(['status' => AcademicPeriodStatus::Closed->value]);

            $period->update(['status' => AcademicPeriodStatus::Active]);

            return $period->refresh();
        });
    }

    public function transitionTo(AcademicPeriod $period, AcademicPeriodStatus|string $newStatus): AcademicPeriod
    {
        $target = $newStatus instanceof AcademicPeriodStatus
            ? $newStatus
            : AcademicPeriodStatus::from($newStatus);

        return DB::transaction(function () use ($period, $target) {
            $period = AcademicPeriod::query()->lockForUpdate()->findOrFail($period->id);
            $current = $period->status;

            if ($current === $target) {
                return $period;
            }

            $currentIndex = array_search($current, self::LIFECYCLE, true);
            $targetIndex = array_search($target, self::LIFECYCLE, true);

            if ($currentIndex === false || $targetIndex === false || $targetIndex !== $currentIndex + 1) {
                throw ValidationException::withMessages([
                    'status' => [sprintf(
                        'لا يمكن الانتقال من %s إلى %s مباشرة',
                        $current->label(),
                        $target->label(),
                    )],
                ]);
            }

            if ($target === AcademicPeriodStatus::Active) {
                AcademicPeriod::query()
                    ->where('status', AcademicPeriodStatus::Active)
                    ->whereKeyNot($period->id)
                    ->update(['status' => AcademicPeriodStatus::Closed->value]);
            }

            $period->update(['status' => $target]);

            return $period->refresh();
        });
    }

    public function currentActive(): ?AcademicPeriod
    {
        return AcademicPeriod::query()
            ->where('status', AcademicPeriodStatus::Active)
            ->first();
    }
}
