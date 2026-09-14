<?php

namespace App\Http\Resources;

use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Grade */
class GradeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'educational_stage_id' => $this->educational_stage_id,
            'name' => $this->name,
            'order' => $this->order,
            'subjects_count' => $this->whenCounted('subjects'),
            'educational_stage' => new EducationalStageResource($this->whenLoaded('educationalStage')),
            'subjects' => SubjectResource::collection($this->whenLoaded('subjects')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
