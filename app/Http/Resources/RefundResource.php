<?php

namespace App\Http\Resources;

use App\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Refund */
class RefundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'amount' => $this->amount,
            'type' => $this->type?->value,
            'method' => $this->method?->value,
            'reason' => $this->reason,
            'processed_by' => $this->processed_by,
            'processor' => $this->whenLoaded('processor', fn () => [
                'id' => $this->processor->id,
                'name' => $this->processor->name,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
