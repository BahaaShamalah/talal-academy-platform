<?php

namespace App\Http\Resources;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Invoice */
class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'student_id' => $this->student_id,
            'period_id' => $this->period_id,
            'coupon_id' => $this->coupon_id,
            'status' => $this->status?->value,
            'can_pay_online' => $this->status === InvoiceStatus::Pending && ! $this->hasInstallments(),
            'has_installments' => $this->hasInstallments(),
            'subtotal' => $this->subtotal,
            'coupon_discount_amount' => $this->coupon_discount_amount,
            'family_discount_percentage' => $this->family_discount_percentage,
            'family_discount_amount' => $this->family_discount_amount,
            'credit_applied_amount' => $this->credit_applied_amount,
            'total' => $this->total,
            'payment_method' => $this->payment_method?->value,
            'paid_at' => $this->paid_at,
            'created_by' => $this->created_by,
            'creator' => $this->created_by === null
                ? ['id' => null, 'name' => 'ولي الأمر (تسجيل ذاتي)']
                : $this->whenLoaded('creator', fn () => [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ]),
            'notes' => $this->notes,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'full_name' => $this->student->full_name,
                'file_number' => $this->student->file_number,
            ]),
            'coupon' => $this->whenLoaded('coupon', fn () => $this->coupon ? [
                'id' => $this->coupon->id,
                'code' => $this->coupon->code,
                'type' => $this->coupon->type?->value,
                'value' => $this->coupon->value,
            ] : null),
            'items' => InvoiceItemResource::collection($this->whenLoaded('items')),
            'installments' => InvoiceInstallmentResource::collection($this->whenLoaded('installments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
