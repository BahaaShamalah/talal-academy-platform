<?php

namespace App\Http\Resources;

use App\Models\EducationalStage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EducationalStage */
class EducationalStageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'order' => $this->order,
            'grades_count' => $this->whenCounted('grades'),
            'grades' => GradeResource::collection($this->whenLoaded('grades')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
