<?php

namespace App\Http\Resources;

use App\Models\PrivateLessonInquiry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PrivateLessonInquiry */
class PrivateLessonInquiryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_name' => $this->student_name,
            'phone' => $this->phone,
            'phone_secondary' => $this->phone_secondary,
            'grade_id' => $this->grade_id,
            'subject_id' => $this->subject_id,
            'hours' => $this->hours,
            'status' => $this->status?->value,
            'admin_notes' => $this->admin_notes,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at,
            'grade' => $this->whenLoaded('grade', fn () => [
                'id' => $this->grade->id,
                'name' => $this->grade->name,
            ]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ]),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
