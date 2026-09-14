<?php

namespace App\Http\Resources;

use App\Models\InvoiceInstallment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InvoiceInstallment */
class InvoiceInstallmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'sequence' => $this->sequence,
            'amount' => $this->amount,
            'due_date' => $this->due_date?->toDateString(),
            'status' => $this->status?->value,
            'is_overdue' => $this->is_overdue,
            'paid_at' => $this->paid_at,
            'payment_method' => $this->payment_method?->value,
            'invoice' => $this->whenLoaded('invoice', fn () => [
                'id' => $this->invoice->id,
                'invoice_number' => $this->invoice->invoice_number,
                'student' => $this->invoice->relationLoaded('student') && $this->invoice->student ? [
                    'id' => $this->invoice->student->id,
                    'full_name' => $this->invoice->student->full_name,
                    'file_number' => $this->invoice->student->file_number,
                ] : null,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
