<?php

namespace App\Services;

use App\Enums\StaffAttendanceStatus;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class StaffAttendanceService
{
    /**
     * @return LengthAwarePaginator<int, StaffAttendanceRecord>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(StaffAttendanceRecord::class)
            ->with(['user', 'marker'])
            ->allowedFilters(
                AllowedFilter::exact('user_id'),
                AllowedFilter::exact('date'),
                AllowedFilter::exact('status'),
            )
            ->defaultSort('-date')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    public function checkIn(User $user): StaffAttendanceRecord
    {
        $user->loadMissing('staffProfile');

        return DB::transaction(function () use ($user) {
            $today = now()->toDateString();
            $record = StaffAttendanceRecord::query()
                ->where('user_id', $user->id)
                ->whereDate('date', $today)
                ->lockForUpdate()
                ->first();

            if ($record?->check_in_time) {
                throw new ConflictHttpException('تم تسجيل الحضور مسبقاً لهذا اليوم.');
            }

            $now = now();
            $lateMinutes = $this->minutesAfterExpected(
                $user->staffProfile?->expected_start_time,
                $now,
            );

            $payload = [
                'user_id' => $user->id,
                'date' => $today,
                'check_in_time' => $now->format('H:i:s'),
                'late_minutes' => $lateMinutes,
                'status' => ($lateMinutes ?? 0) > 0
                    ? StaffAttendanceStatus::Late
                    : StaffAttendanceStatus::Present,
                'marked_by' => null,
            ];

            if ($record) {
                $record->update($payload);

                return $record->refresh()->load(['user', 'marker']);
            }

            return StaffAttendanceRecord::query()->create($payload)->load(['user', 'marker']);
        });
    }

    public function checkOut(User $user): StaffAttendanceRecord
    {
        $user->loadMissing('staffProfile');

        return DB::transaction(function () use ($user) {
            $today = now()->toDateString();
            $record = StaffAttendanceRecord::query()
                ->where('user_id', $user->id)
                ->whereDate('date', $today)
                ->lockForUpdate()
                ->first();

            if (! $record?->check_in_time) {
                throw ValidationException::withMessages([
                    'check_out' => ['لم يُسجَّل حضور اليوم بعد'],
                ])->status(422);
            }

            if ($record->check_out_time) {
                throw new ConflictHttpException('تم تسجيل الانصراف مسبقاً لهذا اليوم.');
            }

            $now = now();
            $record->update([
                'check_out_time' => $now->format('H:i:s'),
                'overtime_minutes' => $this->minutesAfterExpected(
                    $user->staffProfile?->expected_end_time,
                    $now,
                ),
            ]);

            return $record->refresh()->load(['user', 'marker']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): StaffAttendanceRecord
    {
        $this->assertUniqueDay((int) $data['user_id'], $data['date']);

        $payload = $this->payloadFromManualEntry($data, $actor);

        return StaffAttendanceRecord::query()->create($payload)->load(['user', 'marker']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(StaffAttendanceRecord $record, array $data, User $actor): StaffAttendanceRecord
    {
        $userId = (int) ($data['user_id'] ?? $record->user_id);
        $date = $data['date'] ?? $record->date;

        $this->assertUniqueDay($userId, $date, $record->id);

        $merged = [
            'user_id' => $userId,
            'date' => $date instanceof Carbon ? $date->toDateString() : $date,
            'check_in_time' => array_key_exists('check_in_time', $data)
                ? $data['check_in_time']
                : $record->check_in_time,
            'check_out_time' => array_key_exists('check_out_time', $data)
                ? $data['check_out_time']
                : $record->check_out_time,
            'status' => $data['status'] ?? $record->status,
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $record->notes,
            'late_minutes' => $data['late_minutes'] ?? null,
            'overtime_minutes' => $data['overtime_minutes'] ?? null,
        ];

        if (! array_key_exists('late_minutes', $data)) {
            unset($merged['late_minutes']);
        }
        if (! array_key_exists('overtime_minutes', $data)) {
            unset($merged['overtime_minutes']);
        }

        $record->update($this->payloadFromManualEntry($merged, $actor));

        return $record->refresh()->load(['user', 'marker']);
    }

    public function delete(StaffAttendanceRecord $record): void
    {
        $record->delete();
    }

    /**
     * @return array{
     *     user_id: int,
     *     month: string,
     *     present_days: int,
     *     absent_days: int,
     *     late_days: int,
     *     total_late_minutes: int,
     *     total_overtime_minutes: int
     * }
     */
    public function summary(int $userId, string $month): array
    {
        $start = Carbon::parse($month.'-01')->startOfMonth();
        $end = $start->copy()->endOfMonth()->toDateString();
        $start = $start->toDateString();

        $query = StaffAttendanceRecord::query()
            ->where('user_id', $userId)
            ->whereBetween('date', [$start, $end]);

        return [
            'user_id' => $userId,
            'month' => $month,
            'present_days' => (clone $query)->where('status', StaffAttendanceStatus::Present)->count(),
            'absent_days' => (clone $query)->where('status', StaffAttendanceStatus::Absent)->count(),
            'late_days' => (clone $query)->where('status', StaffAttendanceStatus::Late)->count(),
            'total_late_minutes' => (int) (clone $query)->sum('late_minutes'),
            'total_overtime_minutes' => (int) (clone $query)->sum('overtime_minutes'),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function payloadFromManualEntry(array $data, User $actor): array
    {
        $userId = (int) $data['user_id'];
        $date = $data['date'] instanceof Carbon
            ? $data['date']->toDateString()
            : Carbon::parse($data['date'])->toDateString();

        $profile = StaffProfile::query()->where('user_id', $userId)->first();

        $lateMinutes = array_key_exists('late_minutes', $data)
            ? $data['late_minutes']
            : $this->minutesAfterExpected(
                $profile?->expected_start_time,
                $this->combineDateAndTime($date, $data['check_in_time'] ?? null),
            );

        $overtimeMinutes = array_key_exists('overtime_minutes', $data)
            ? $data['overtime_minutes']
            : $this->minutesAfterExpected(
                $profile?->expected_end_time,
                $this->combineDateAndTime($date, $data['check_out_time'] ?? null),
            );

        return [
            'user_id' => $userId,
            'date' => $date,
            'check_in_time' => $this->normalizeTime($data['check_in_time'] ?? null),
            'check_out_time' => $this->normalizeTime($data['check_out_time'] ?? null),
            'status' => $data['status'] ?? StaffAttendanceStatus::Present,
            'late_minutes' => $lateMinutes,
            'overtime_minutes' => $overtimeMinutes,
            'notes' => $data['notes'] ?? null,
            'marked_by' => $actor->id,
        ];
    }

    private function assertUniqueDay(int $userId, mixed $date, ?int $ignoreId = null): void
    {
        $dateString = $date instanceof Carbon
            ? $date->toDateString()
            : Carbon::parse($date)->toDateString();

        $exists = StaffAttendanceRecord::query()
            ->where('user_id', $userId)
            ->whereDate('date', $dateString)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw new ConflictHttpException('يوجد سجل دوام لهذا الموظف في هذا اليوم مسبقاً.');
        }
    }

    private function minutesAfterExpected(?string $expectedTime, ?Carbon $at): ?int
    {
        if ($expectedTime === null || $expectedTime === '' || $at === null) {
            return null;
        }

        $expectedAt = $at->copy()->setTimeFromTimeString(substr($expectedTime, 0, 8));
        $seconds = (int) $expectedAt->diffInSeconds($at, false);

        return max(0, intdiv($seconds, 60));
    }

    private function combineDateAndTime(string $date, mixed $time): ?Carbon
    {
        $normalized = $this->normalizeTime($time);

        if ($normalized === null) {
            return null;
        }

        return Carbon::parse($date.' '.$normalized);
    }

    private function normalizeTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        if ($time instanceof Carbon) {
            return $time->format('H:i:s');
        }

        return strlen((string) $time) === 5
            ? $time.':00'
            : (string) $time;
    }
}
