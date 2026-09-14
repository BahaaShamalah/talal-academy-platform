<?php

namespace App\Http\Resources;

use App\Models\Evaluation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Evaluation */
class EvaluationResource extends JsonResource
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
            'class_session_id' => $this->class_session_id,
            'numeric_score' => $this->numeric_score,
            'numeric_score_max' => $this->numeric_score_max,
            'level_rating' => $this->level_rating?->value,
            'participation_rating' => $this->participation_rating,
            'understanding_rating' => $this->understanding_rating,
            'homework_rating' => $this->homework_rating,
            'discipline_rating' => $this->discipline_rating,
            'note' => $this->note,
            'created_by' => $this->created_by,
            'class_offering' => new ClassOfferingResource($this->whenLoaded('classOffering')),
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
