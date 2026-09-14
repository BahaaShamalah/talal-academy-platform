<?php

namespace App\Http\Resources;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Plan */
class PlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_type_id' => $this->product_type_id,
            'grade_id' => $this->grade_id,
            'educational_stage_id' => $this->educational_stage_id,
            'period_id' => $this->period_id,
            'subject_id' => $this->subject_id,
            'subject_selection_count' => $this->subject_selection_count,
            'duration_period_id' => $this->duration_period_id,
            'installment_template_id' => $this->installment_template_id,
            'name' => $this->name,
            'description' => $this->description,
            'duration_type' => $this->duration_type,
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'is_active' => $this->is_active,
            'product_type' => $this->when(
                $this->relationLoaded('productType') && $this->productType,
                fn () => [
                    'id' => $this->productType->id,
                    'name_ar' => $this->productType->name_ar,
                    'subject_selection_mode' => $this->productType->subject_selection_mode?->value,
                    'requires_grade' => $this->productType->requires_grade,
                    'is_schedulable' => $this->productType->is_schedulable,
                ],
            ),
            'grade' => new GradeResource($this->whenLoaded('grade')),
            'educational_stage' => $this->when(
                $this->relationLoaded('educationalStage') && $this->educationalStage,
                fn () => [
                    'id' => $this->educationalStage->id,
                    'name' => $this->educationalStage->name,
                ],
            ),
            'subject' => new SubjectResource($this->whenLoaded('subject')),
            'period' => $this->when(
                $this->relationLoaded('period') && $this->period,
                fn () => [
                    'id' => $this->period->id,
                    'name' => $this->period->name,
                    'status' => $this->period->status?->value,
                ],
            ),
            'duration_period' => $this->when(
                $this->relationLoaded('durationPeriod') && $this->durationPeriod,
                fn () => [
                    'id' => $this->durationPeriod->id,
                    'name' => $this->durationPeriod->name,
                    'start_date' => $this->durationPeriod->start_date?->toDateString(),
                    'end_date' => $this->durationPeriod->end_date?->toDateString(),
                    'status' => $this->durationPeriod->status,
                ],
            ),
            'installment_template' => $this->when(
                $this->relationLoaded('installmentTemplate') && $this->installmentTemplate,
                fn () => new InstallmentTemplateResource($this->installmentTemplate),
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
