<?php

namespace App\Http\Resources;

use App\Models\StaffAttendanceRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StaffAttendanceRecord */
class StaffAttendanceRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'date' => $this->date?->toDateString(),
            'check_in_time' => $this->formatTime($this->check_in_time),
            'check_out_time' => $this->formatTime($this->check_out_time),
            'status' => $this->status?->value,
            'late_minutes' => $this->late_minutes,
            'overtime_minutes' => $this->overtime_minutes,
            'notes' => $this->notes,
            'marked_by' => $this->marked_by,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'marker' => $this->whenLoaded('marker', fn () => $this->marker ? [
                'id' => $this->marker->id,
                'name' => $this->marker->name,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        return substr((string) $time, 0, 8);
    }
}
