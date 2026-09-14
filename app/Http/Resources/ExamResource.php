<?php

namespace App\Http\Resources;

use App\Models\Exam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Exam */
class ExamResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'exam_date' => $this->exam_date?->toDateString(),
            'class_offering_id' => $this->class_offering_id,
            'max_score' => $this->max_score,
            'period_id' => $this->period_id,
            'created_by' => $this->created_by,
            'class_offering' => new ClassOfferingResource($this->whenLoaded('classOffering')),
            'period' => $this->whenLoaded('period', fn () => [
                'id' => $this->period->id,
                'name' => $this->period->name,
            ]),
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
