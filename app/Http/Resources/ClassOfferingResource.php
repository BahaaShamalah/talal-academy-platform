<?php

namespace App\Http\Resources;

use App\Models\ClassOffering;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClassOffering */
class ClassOfferingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grade_id' => $this->grade_id,
            'grade_section_id' => $this->grade_section_id,
            'subject_id' => $this->subject_id,
            'teacher_id' => $this->teacher_id,
            'hall_id' => $this->hall_id,
            'period_id' => $this->period_id,
            'gender' => $this->gender?->value,
            'status' => $this->status,
            'grade' => new GradeResource($this->whenLoaded('grade')),
            'grade_section' => new GradeSectionResource($this->whenLoaded('gradeSection')),
            'subject' => new SubjectResource($this->whenLoaded('subject')),
            'teacher' => new UserResource($this->whenLoaded('teacher')),
            'hall' => new HallResource($this->whenLoaded('hall')),
            'period' => new AcademicPeriodResource($this->whenLoaded('period')),
            'schedules' => ClassScheduleResource::collection($this->whenLoaded('schedules')),
            'active_students_count' => $this->whenCounted('active_students_count'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
