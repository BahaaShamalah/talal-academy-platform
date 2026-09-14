<?php

namespace App\Http\Resources;

use App\Models\EducationalMaterial;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EducationalMaterial */
class EducationalMaterialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'media_id' => $this->media_id,
            'scope' => $this->scope?->value,
            'grade_id' => $this->grade_id,
            'subject_id' => $this->subject_id,
            'student_id' => $this->student_id,
            'class_offering_id' => $this->class_offering_id,
            'period_id' => $this->period_id,
            'uploaded_by' => $this->uploaded_by,
            'media' => new MediaResource($this->whenLoaded('media')),
            'grade' => $this->whenLoaded('grade', fn () => [
                'id' => $this->grade->id,
                'name' => $this->grade->name,
            ]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ]),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'full_name' => $this->student->full_name,
            ]),
            'period' => $this->whenLoaded('period', fn () => [
                'id' => $this->period->id,
                'name' => $this->period->name,
            ]),
            'uploader' => $this->whenLoaded('uploader', fn () => [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
