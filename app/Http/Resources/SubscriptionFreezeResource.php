<?php

namespace App\Http\Resources;

use App\Models\SubscriptionFreeze;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SubscriptionFreeze */
class SubscriptionFreezeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_plan_subscription_id' => $this->student_plan_subscription_id,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'reason' => $this->reason,
            'pauses_installments' => $this->pauses_installments,
            'pauses_attendance_expectation' => $this->pauses_attendance_expectation,
            'extends_subscription' => $this->extends_subscription,
            'previous_status' => $this->previous_status,
            'status' => $this->status?->value,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
