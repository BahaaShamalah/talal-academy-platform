<?php

namespace App\Http\Resources;

use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Enrollment */
class EnrollmentResource extends JsonResource
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
            'status' => $this->status,
            'enrolled_at' => $this->enrolled_at,
            'created_by' => $this->created_by,
            'creator' => $this->created_by === null
                ? ['id' => null, 'name' => 'ولي الأمر (تسجيل ذاتي)']
                : $this->whenLoaded('creator', fn () => $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ] : null),
            'student' => new StudentResource($this->whenLoaded('student')),
            'class_offering' => new ClassOfferingResource($this->whenLoaded('classOffering')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
