<?php

namespace App\Http\Resources;

use App\Models\StudentPlanSubscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StudentPlanSubscription */
class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'plan_id' => $this->plan_id,
            'invoice_id' => $this->invoice_id,
            'period_id' => $this->period_id,
            'status' => $this->status?->value,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'cancelled_at' => $this->cancelled_at,
            'plan' => $this->whenLoaded('plan', fn () => [
                'id' => $this->plan->id,
                'name' => $this->plan->name,
                'price' => $this->plan->price,
                'compare_at_price' => $this->plan->compare_at_price,
                'duration_type' => $this->plan->duration_type?->value,
                'duration_period_id' => $this->plan->duration_period_id,
                'subject' => $this->plan->relationLoaded('subject') && $this->plan->subject
                    ? ['id' => $this->plan->subject->id, 'name' => $this->plan->subject->name]
                    : null,
                'product_type' => $this->plan->relationLoaded('productType') && $this->plan->productType
                    ? [
                        'id' => $this->plan->productType->id,
                        'name_ar' => $this->plan->productType->name_ar,
                    ]
                    : null,
                'duration_period' => $this->plan->relationLoaded('durationPeriod') && $this->plan->durationPeriod
                    ? [
                        'id' => $this->plan->durationPeriod->id,
                        'name' => $this->plan->durationPeriod->name,
                    ]
                    : null,
            ]),
            'selected_subjects' => $this->whenLoaded('selectedSubjects', fn () => $this->selectedSubjects
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'subject_id' => $row->subject_id,
                    'subject' => $row->relationLoaded('subject') && $row->subject
                        ? ['id' => $row->subject->id, 'name' => $row->subject->name]
                        : null,
                ])
                ->values()
                ->all()),
            'invoice' => $this->whenLoaded('invoice', fn () => [
                'id' => $this->invoice->id,
                'invoice_number' => $this->invoice->invoice_number,
                'status' => $this->invoice->status?->value,
                'total' => $this->invoice->total,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
