<?php

namespace App\Http\Resources;

use App\Models\PrivateLessonSlot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PrivateLessonSlot */
class PrivateLessonSlotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'private_lesson_offer_id' => $this->private_lesson_offer_id,
            'day_of_week' => $this->day_of_week,
            'specific_date' => $this->specific_date?->toDateString(),
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'capacity' => $this->capacity,
            'available_spots' => $this->when(
                isset($this->available_spots),
                fn () => (int) $this->available_spots,
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null) {
            return null;
        }

        return substr((string) $time, 0, 5);
    }
}
