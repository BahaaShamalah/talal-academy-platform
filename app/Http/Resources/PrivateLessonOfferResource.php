<?php

namespace App\Http\Resources;

use App\Models\PrivateLessonOffer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PrivateLessonOffer */
class PrivateLessonOfferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing('imageMedia');

        return [
            'id' => $this->id,
            'grade_id' => $this->grade_id,
            'subject_id' => $this->subject_id,
            'teacher_id' => $this->teacher_id,
            'duration_minutes' => $this->duration_minutes,
            'session_type' => $this->session_type?->value,
            'price' => $this->price,
            'max_students' => $this->max_students,
            'status' => $this->status?->value,
            'image_media_id' => $this->image_media_id,
            'image_url' => $this->imageMedia?->url(),
            'grade' => $this->whenLoaded('grade', fn () => [
                'id' => $this->grade->id,
                'name' => $this->grade->name,
            ]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ]),
            'teacher' => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ]),
            'slots' => PrivateLessonSlotResource::collection($this->whenLoaded('slots')),
            'slots_count' => $this->when(
                $this->relationLoaded('slots'),
                fn () => $this->slots->count(),
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
