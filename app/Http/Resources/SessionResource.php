<?php

namespace App\Http\Resources;

use App\Models\ClassSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClassSession */
class SessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'class_offering_id' => $this->class_offering_id,
            'class_schedule_id' => $this->class_schedule_id,
            'teacher_id' => $this->teacher_id,
            'hall_id' => $this->hall_id,
            'session_date' => $this->session_date?->toDateString(),
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'status' => $this->status?->value,
            'modified_from_schedule' => (bool) $this->modified_from_schedule,
            'is_makeup' => (bool) $this->is_makeup,
            'needs_substitute' => (bool) $this->needs_substitute,
            'cancellation_reason' => $this->cancellation_reason,
            'class_offering' => $this->whenLoaded('classOffering', function () {
                $grade = $this->classOffering->relationLoaded('grade')
                    ? $this->classOffering->grade?->name
                    : null;
                $subject = $this->classOffering->relationLoaded('subject')
                    ? $this->classOffering->subject?->name
                    : null;

                return [
                    'id' => $this->classOffering->id,
                    'grade_name' => $grade,
                    'label' => trim(($grade ?? '').' — '.($subject ?? ''), ' —'),
                ];
            }),
            'enrolled_count' => $this->when(
                isset($this->enrolled_count),
                fn () => (int) $this->enrolled_count
            ),
            'marked_count' => $this->when(
                isset($this->marked_count),
                fn () => (int) $this->marked_count
            ),
            'present_count' => $this->when(
                isset($this->present_count),
                fn () => (int) $this->present_count
            ),
            'absent_count' => $this->when(
                isset($this->absent_count),
                fn () => (int) $this->absent_count
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
