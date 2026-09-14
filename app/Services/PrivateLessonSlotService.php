<?php

namespace App\Services;

use App\Enums\PrivateLessonSessionType;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PrivateLessonSlotService
{
    /**
     * @return LengthAwarePaginator<int, PrivateLessonSlot>
     */
    public function listForOffer(PrivateLessonOffer $offer, Request $request): LengthAwarePaginator
    {
        return $offer->slots()
            ->orderBy('specific_date')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(PrivateLessonOffer $offer, array $data): PrivateLessonSlot
    {
        $this->validateScheduleFields($data);
        $data['capacity'] = $this->resolveCapacity($offer, $data);

        return $offer->slots()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PrivateLessonSlot $slot, array $data): PrivateLessonSlot
    {
        $offer = $slot->offer ?? $slot->offer()->firstOrFail();
        $merged = array_merge([
            'day_of_week' => $slot->day_of_week,
            'specific_date' => $slot->specific_date?->toDateString(),
            'start_time' => substr((string) $slot->start_time, 0, 5),
            'end_time' => substr((string) $slot->end_time, 0, 5),
            'capacity' => $slot->capacity,
        ], $data);

        $this->validateScheduleFields($merged);

        if (array_key_exists('capacity', $data) || isset($data['day_of_week']) || isset($data['specific_date'])) {
            $data['capacity'] = $this->resolveCapacity($offer, $merged);
        }

        $slot->update($data);

        return $slot->refresh();
    }

    public function delete(PrivateLessonSlot $slot): void
    {
        $slot->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateScheduleFields(array $data): void
    {
        $hasDay = array_key_exists('day_of_week', $data) && $data['day_of_week'] !== null;
        $hasDate = array_key_exists('specific_date', $data) && $data['specific_date'] !== null;

        if ($hasDay && $hasDate) {
            throw ValidationException::withMessages([
                'day_of_week' => ['حدّد day_of_week أو specific_date، وليس الاثنين معًا.'],
            ]);
        }

        if (! $hasDay && ! $hasDate) {
            throw ValidationException::withMessages([
                'day_of_week' => ['يجب تحديد day_of_week أو specific_date.'],
            ]);
        }

        $start = $data['start_time'] ?? null;
        $end = $data['end_time'] ?? null;
        if ($start && $end && $end <= $start) {
            throw ValidationException::withMessages([
                'end_time' => ['وقت النهاية يجب أن يكون بعد وقت البداية.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveCapacity(PrivateLessonOffer $offer, array $data): int
    {
        if ($offer->session_type === PrivateLessonSessionType::Individual) {
            return 1;
        }

        $capacity = (int) ($data['capacity'] ?? 1);
        $maxStudents = (int) ($offer->max_students ?? $capacity);

        if ($capacity < 1) {
            throw ValidationException::withMessages([
                'capacity' => ['سعة الموعد يجب أن تكون 1 على الأقل.'],
            ]);
        }

        if ($capacity > $maxStudents) {
            throw ValidationException::withMessages([
                'capacity' => ["سعة الموعد لا يمكن أن تتجاوز الحد الأقصى للعرض ({$maxStudents})."],
            ]);
        }

        return $capacity;
    }
}
