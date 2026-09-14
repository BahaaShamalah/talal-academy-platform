<?php

namespace App\Http\Resources;

use App\Models\GradeSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GradeSection */
class GradeSectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grade_id' => $this->grade_id,
            'period_id' => $this->period_id,
            'name' => $this->name,
            'gender' => $this->gender?->value,
            'capacity' => $this->capacity,
            'status' => $this->status,
            'grade' => new GradeResource($this->whenLoaded('grade')),
            'period' => new AcademicPeriodResource($this->whenLoaded('period')),
            'class_offerings_count' => $this->whenCounted('classOfferings'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
