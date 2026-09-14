<?php

namespace App\Http\Resources;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Student */
class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'file_number' => $this->file_number,
            'civil_id' => $this->civil_id,
            'full_name' => $this->full_name,
            'gender' => $this->gender?->value,
            'nationality' => $this->nationality,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'phone' => $this->phone,
            'phone_secondary' => $this->phone_secondary,
            'address' => $this->address,
            'previous_school' => $this->previous_school,
            'current_grade_id' => $this->current_grade_id,
            'guardian_id' => $this->guardian_id,
            'photo_path' => $this->photo_path,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'guardian' => new GuardianResource($this->whenLoaded('guardian')),
            'current_grade' => $this->whenLoaded('currentGrade', function () {
                return [
                    'id' => $this->currentGrade->id,
                    'name' => $this->currentGrade->name,
                    'educational_stage_id' => $this->currentGrade->educational_stage_id,
                    'educational_stage' => $this->currentGrade->relationLoaded('educationalStage')
                        && $this->currentGrade->educationalStage
                        ? [
                            'id' => $this->currentGrade->educationalStage->id,
                            'name' => $this->currentGrade->educationalStage->name,
                        ]
                        : null,
                ];
            }),
            'enrollments_count' => $this->whenCounted('enrollments'),
            'enrollments' => EnrollmentResource::collection($this->whenLoaded('enrollments')),
            'plan_subscriptions' => SubscriptionResource::collection($this->whenLoaded('planSubscriptions')),
            'invoices' => InvoiceResource::collection($this->whenLoaded('invoices')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
