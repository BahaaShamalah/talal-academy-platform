<?php

namespace App\Services;

use App\Enums\ClassSessionStatus;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Validation\ValidationException;

class SessionGeneratorService
{
    /**
     * @return array{created: int, skipped: int, sessions: list<ClassSession>}
     */
    public function generateSessions(ClassOffering $classOffering, string $fromDate, string $toDate): array
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->startOfDay();

        if ($to->lt($from)) {
            throw ValidationException::withMessages([
                'to_date' => ['تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.'],
            ]);
        }

        if ($from->copy()->addMonthsNoOverflow(3)->lt($to)) {
            throw ValidationException::withMessages([
                'to_date' => ['المدى الزمني لتوليد الجلسات لا يجوز أن يتجاوز ثلاثة أشهر في الطلب الواحد.'],
            ]);
        }

        $schedules = $classOffering->relationLoaded('schedules')
            ? $classOffering->schedules
            : $classOffering->schedules()->get();

        if ($schedules->isEmpty()) {
            throw ValidationException::withMessages([
                'class_offering' => ['لا يمكن توليد جلسات: لا يوجد جدول أسبوعي لعرض هذه المادة.'],
            ]);
        }

        $scheduleByDow = [];
        foreach ($schedules as $schedule) {
            $scheduleByDow[(int) $schedule->day_of_week][] = $schedule;
        }

        $existingKeys = ClassSession::query()
            ->where('class_offering_id', $classOffering->id)
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->get(['id', 'session_date', 'class_schedule_id'])
            ->mapWithKeys(function (ClassSession $session) {
                $date = $session->session_date?->toDateString() ?? (string) $session->session_date;
                $key = $date.'|'.(int) $session->class_schedule_id;

                return [$key => true];
            });

        $created = 0;
        $skipped = $existingKeys->count();
        $toInsert = [];

        foreach (CarbonPeriod::create($from, $to) as $date) {
            /** @var Carbon $date */
            $dow = (int) $date->dayOfWeek;
            foreach ($scheduleByDow[$dow] ?? [] as $schedule) {
                $key = $date->toDateString().'|'.(int) $schedule->id;
                if ($existingKeys->has($key)) {
                    continue;
                }

                $toInsert[] = [
                    'class_offering_id' => $classOffering->id,
                    'class_schedule_id' => $schedule->id,
                    'teacher_id' => $classOffering->teacher_id,
                    'hall_id' => $classOffering->hall_id,
                    'session_date' => $date->toDateString(),
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'status' => ClassSessionStatus::Scheduled->value,
                    'modified_from_schedule' => 0,
                    'is_makeup' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $existingKeys->put($key, true);
                $created++;
            }
        }

        if ($toInsert !== []) {
            foreach (array_chunk($toInsert, 200) as $chunk) {
                ClassSession::query()->insert($chunk);
            }
        }

        $sessions = ClassSession::query()
            ->where('class_offering_id', $classOffering->id)
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->all();

        return [
            'created' => $created,
            'skipped' => $skipped,
            'sessions' => $sessions,
        ];
    }

    /**
     * Ensure sessions exist for offerings in a date range.
     * Skips generateSessions when the range already has enough sessions (avoids per-request regen).
     *
     * @param  iterable<int, ClassOffering>  $offerings
     */
    public function ensureSessionsInRange(iterable $offerings, string $fromDate, string $toDate): void
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->startOfDay();
        $start = $from->toDateString();
        $end = $to->toDateString();

        $list = collect($offerings)->filter()->unique('id')->values();
        if ($list->isEmpty()) {
            return;
        }

        foreach ($list as $offering) {
            $offering->loadMissing('schedules');
        }

        $offeringIds = $list->pluck('id')->map(fn ($id) => (int) $id)->all();

        $existingCounts = ClassSession::query()
            ->selectRaw('class_offering_id, COUNT(*) as c')
            ->whereIn('class_offering_id', $offeringIds)
            ->whereDate('session_date', '>=', $start)
            ->whereDate('session_date', '<=', $end)
            ->groupBy('class_offering_id')
            ->pluck('c', 'class_offering_id');

        $days = $from->diffInDays($to) + 1;

        foreach ($list as $classOffering) {
            $expected = 0;
            $schedulesByDow = $classOffering->schedules->groupBy(fn ($s) => (int) $s->day_of_week);
            for ($i = 0; $i < $days; $i++) {
                $dow = (int) $from->copy()->addDays($i)->dayOfWeek;
                $expected += $schedulesByDow->get($dow)?->count() ?? 0;
            }

            $have = (int) ($existingCounts[$classOffering->id] ?? 0);
            if ($expected > 0 && $have >= $expected) {
                continue;
            }

            try {
                $this->generateSessions($classOffering, $start, $end);
            } catch (ValidationException) {
                // No weekly schedule or invalid range for this offering.
            }
        }
    }

    /**
     * Generate sessions from today through the academic period end (chunked for API limit).
     *
     * @return array{created: int, skipped: int, sessions: list<ClassSession>}
     */
    public function generateSessionsThroughPeriod(ClassOffering $classOffering): array
    {
        [$from, $to] = $this->periodDateRange($classOffering);

        $created = 0;
        $skipped = 0;
        $sessions = [];

        $cursor = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->startOfDay();

        while ($cursor->lte($end)) {
            $chunkEnd = $cursor->copy()->addMonthsNoOverflow(3)->subDay();
            if ($chunkEnd->gt($end)) {
                $chunkEnd = $end->copy();
            }

            $result = $this->generateSessions(
                $classOffering,
                $cursor->toDateString(),
                $chunkEnd->toDateString(),
            );
            $created += $result['created'];
            $skipped += $result['skipped'];
            $sessions = array_merge($sessions, $result['sessions']);
            $cursor = $chunkEnd->copy()->addDay();
        }

        return [
            'created' => $created,
            'skipped' => $skipped,
            'sessions' => $sessions,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function periodDateRange(ClassOffering $classOffering): array
    {
        $classOffering->loadMissing('period');
        $period = $classOffering->period;

        $from = now()->toDateString();
        $to = $period?->end_date?->toDateString() ?? now()->addMonthsNoOverflow(3)->toDateString();

        if ($period?->start_date && $period->start_date->gt(now())) {
            $from = $period->start_date->toDateString();
        }

        return [$from, $to];
    }
}
