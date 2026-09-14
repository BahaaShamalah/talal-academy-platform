<?php

namespace App\Http\Resources;

use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Subject */
class SubjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'grades_count' => $this->whenCounted('grades'),
            'grades' => GradeResource::collection($this->whenLoaded('grades')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
