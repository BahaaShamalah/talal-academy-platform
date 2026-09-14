<?php

namespace App\Http\Resources;

use App\Models\CreditTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CreditTransaction */
class CreditTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guardian_id' => $this->guardian_id,
            'amount' => $this->amount,
            'type' => $this->type?->value,
            'related_invoice_id' => $this->related_invoice_id,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
