<?php

namespace App\Http\Resources;

use App\Models\ClassSchedule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClassSchedule */
class ClassScheduleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'class_offering_id' => $this->class_offering_id,
            'day_of_week' => $this->day_of_week,
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'class_offering' => new ClassOfferingResource($this->whenLoaded('classOffering')),
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
