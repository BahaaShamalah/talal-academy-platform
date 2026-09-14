<?php

namespace App\Services;

use App\Enums\ClassSessionStatus;
use App\Enums\CompensationComponentType;
use App\Enums\CompensationType;
use App\Enums\PayrollRunStatus;
use App\Models\ClassSession;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\StaffCompensationComponent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class PayrollService
{
    /**
     * @return LengthAwarePaginator<int, PayrollRun>
     */
    public function listRuns(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(PayrollRun::class)
            ->allowedFilters(AllowedFilter::exact('status'))
            ->allowedIncludes(
                AllowedInclude::relationship('items'),
                AllowedInclude::relationship('items.teacher'),
            )
            ->defaultSort('-period_month')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    public function generateRun(string $periodMonth, int $createdBy): PayrollRun
    {
        $period = Carbon::parse($periodMonth)->startOfMonth();
        $periodStart = $period->copy()->startOfMonth();
        $periodEnd = $period->copy()->endOfMonth();

        if (PayrollRun::query()->whereDate('period_month', $period->toDateString())->exists()) {
            throw new ConflictHttpException('توجد تشغيلة رواتب لهذا الشهر مسبقًا.');
        }

        $teachingStaffIds = User::query()->where('is_teaching_staff', true)->pluck('id')->all();
        $teachingStaffLookup = array_flip($teachingStaffIds);

        /** @var Collection<int, Collection<int, StaffCompensationComponent>> $componentsByUser */
        $componentsByUser = StaffCompensationComponent::query()
            ->activeForPeriod($periodStart, $periodEnd)
            ->orderBy('id')
            ->get()
            ->groupBy('user_id');

        return DB::transaction(function () use (
            $period,
            $periodStart,
            $createdBy,
            $componentsByUser,
            $teachingStaffIds,
            $teachingStaffLookup,
        ) {
            $run = PayrollRun::query()->create([
                'period_month' => $period->toDateString(),
                'status' => PayrollRunStatus::Draft,
                'created_by' => $createdBy,
            ]);

            $processedUserIds = [];

            foreach ($componentsByUser as $userId => $components) {
                $userId = (int) $userId;
                if (! isset($teachingStaffLookup[$userId])) {
                    Log::warning('Payroll generate skipped: user has compensation components but is not teaching staff.', [
                        'user_id' => $userId,
                        'period_month' => $period->toDateString(),
                    ]);

                    continue;
                }

                $payload = $this->buildItemPayloadFromComponents($userId, $components, $periodStart);
                $run->items()->create($payload);
                $processedUserIds[] = $userId;
            }

            $teachersWithoutComponents = array_diff($teachingStaffIds, $processedUserIds);
            foreach ($teachersWithoutComponents as $teacherId) {
                Log::warning('Payroll generate skipped teacher without active compensation components.', [
                    'teacher_id' => $teacherId,
                    'period_month' => $period->toDateString(),
                ]);
            }

            return $run->load(['items.teacher']);
        });
    }

    /**
     * @param  array{base_amount?: mixed, deductions?: mixed, bonus?: mixed, notes?: mixed}  $data
     */
    public function updateItem(PayrollRun $run, PayrollItem $item, array $data): PayrollItem
    {
        if ($item->payroll_run_id !== $run->id) {
            abort(404);
        }

        if ($run->status === PayrollRunStatus::Finalized) {
            throw new ConflictHttpException('لا يمكن تعديل بنود رواتب لتشغيلة مُعتمدة.');
        }

        if (array_key_exists('base_amount', $data)) {
            if ($item->compensation_type !== CompensationType::Manual) {
                throw ValidationException::withMessages([
                    'base_amount' => ['يمكن تعديل المبلغ الأساسي فقط لنوع الأجر اليدوي (manual).'],
                ]);
            }
            $item->base_amount = $data['base_amount'];
        }

        if (array_key_exists('deductions', $data)) {
            $item->deductions = $data['deductions'];
        }

        if (array_key_exists('bonus', $data)) {
            $item->bonus = $data['bonus'];
        }

        if (array_key_exists('notes', $data)) {
            $item->notes = $data['notes'];
        }

        $item->save();

        return $item->refresh()->load('teacher');
    }

    public function finalizeRun(PayrollRun $run, int $finalizedBy): PayrollRun
    {
        if ($run->status === PayrollRunStatus::Finalized) {
            throw new ConflictHttpException('هذه التشغيلة معتمدة مسبقًا.');
        }

        $incomplete = $run->items()
            ->with('teacher')
            ->where('compensation_type', CompensationType::Manual)
            ->whereNull('base_amount')
            ->get();

        if ($incomplete->isNotEmpty()) {
            $names = $incomplete
                ->map(fn (PayrollItem $item) => $item->teacher?->name ?? ('#'.$item->teacher_id))
                ->implode('، ');

            throw ValidationException::withMessages([
                'payroll_run' => [
                    "لا يمكن الاعتماد: يوجد معلمون من نوع أجر يدوي بدون مبلغ أساسي: {$names}",
                ],
            ]);
        }

        $run->update([
            'status' => PayrollRunStatus::Finalized,
            'finalized_at' => now(),
            'finalized_by' => $finalizedBy,
        ]);

        return $run->refresh()->load(['items.teacher']);
    }

    /**
     * @param  Collection<int, StaffCompensationComponent>  $components
     * @return array{
     *     compensation_type: CompensationType,
     *     sessions_count: ?int,
     *     base_amount: float,
     *     deductions: float,
     *     bonus: float,
     *     teacher_id: int,
     *     net_amount: float
     * }
     */
    private function buildItemPayloadFromComponents(int $userId, Collection $components, Carbon $period): array
    {
        $baseSalary = 0.0;
        $sessionRate = 0.0;
        $incentives = 0.0;
        $hasSessionRate = false;

        foreach ($components as $component) {
            $amount = (float) $component->amount;

            switch ($component->component_type) {
                case CompensationComponentType::BaseSalary:
                    $baseSalary += $amount;
                    break;
                case CompensationComponentType::PerSessionRate:
                    $sessionRate += $amount;
                    $hasSessionRate = true;
                    break;
                case CompensationComponentType::FixedIncentive:
                case CompensationComponentType::RecurringBonus:
                    $incentives += $amount;
                    break;
            }
        }

        $sessionsCount = null;
        $sessionPay = 0.0;
        if ($hasSessionRate) {
            $sessionsCount = $this->countCompletedSessions($userId, $period);
            $sessionPay = round($sessionsCount * $sessionRate, 3);
        }

        $baseAmount = round($baseSalary + $sessionPay + $incentives, 3);

        return [
            'teacher_id' => $userId,
            'compensation_type' => CompensationType::Composite,
            'sessions_count' => $sessionsCount,
            'base_amount' => $baseAmount,
            'deductions' => 0,
            'bonus' => 0,
            'net_amount' => $baseAmount,
        ];
    }

    private function countCompletedSessions(int $teacherId, Carbon $period): int
    {
        $from = $period->copy()->startOfMonth()->toDateString();
        $to = $period->copy()->endOfMonth()->toDateString();

        return ClassSession::query()
            ->where('status', ClassSessionStatus::Completed)
            ->whereBetween('session_date', [$from, $to])
            ->whereHas('classOffering', fn ($q) => $q->where('teacher_id', $teacherId))
            ->count();
    }
}
