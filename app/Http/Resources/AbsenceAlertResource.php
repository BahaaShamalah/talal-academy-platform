<?php

namespace App\Http\Resources;

use App\Models\AbsenceAlert;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AbsenceAlert */
class AbsenceAlertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'class_offering_id' => $this->class_offering_id,
            'consecutive_count' => $this->consecutive_count,
            'alert_level' => $this->alert_level?->value,
            'triggered_at' => $this->triggered_at,
            'acknowledged' => $this->acknowledged,
            'acknowledged_by' => $this->acknowledged_by,
            'acknowledged_at' => $this->acknowledged_at,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'full_name' => $this->student->full_name,
                'file_number' => $this->student->file_number,
            ]),
            'class_offering' => new ClassOfferingResource($this->whenLoaded('classOffering')),
            'acknowledger' => $this->whenLoaded('acknowledger', fn () => [
                'id' => $this->acknowledger->id,
                'name' => $this->acknowledger->name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
