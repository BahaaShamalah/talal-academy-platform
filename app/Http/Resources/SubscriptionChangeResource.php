<?php

namespace App\Http\Resources;

use App\Models\SubscriptionChange;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SubscriptionChange */
class SubscriptionChangeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_plan_subscription_id' => $this->student_plan_subscription_id,
            'change_type' => $this->change_type?->value,
            'old_plan_id' => $this->old_plan_id,
            'new_plan_id' => $this->new_plan_id,
            'subject_id' => $this->subject_id,
            'calculated_amount_difference' => $this->calculated_amount_difference,
            'final_amount_difference' => $this->final_amount_difference,
            'supplementary_invoice_id' => $this->supplementary_invoice_id,
            'credit_transaction_id' => $this->credit_transaction_id,
            'reason' => $this->reason,
            'created_by' => $this->created_by,
            'old_plan' => $this->whenLoaded('oldPlan', fn () => [
                'id' => $this->oldPlan->id,
                'name' => $this->oldPlan->name,
            ]),
            'new_plan' => $this->whenLoaded('newPlan', fn () => [
                'id' => $this->newPlan->id,
                'name' => $this->newPlan->name,
            ]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ]),
            'supplementary_invoice' => $this->whenLoaded('supplementaryInvoice', fn () => [
                'id' => $this->supplementaryInvoice->id,
                'invoice_number' => $this->supplementaryInvoice->invoice_number,
                'total' => $this->supplementaryInvoice->total,
                'status' => $this->supplementaryInvoice->status?->value,
            ]),
            'credit_transaction' => $this->whenLoaded('creditTransaction', fn () => [
                'id' => $this->creditTransaction->id,
                'amount' => $this->creditTransaction->amount,
                'type' => $this->creditTransaction->type?->value,
            ]),
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
