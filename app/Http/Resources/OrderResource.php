<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'invoice_id' => $this->invoice_id,
            'fulfillment_type' => $this->fulfillment_type?->value,
            'delivery_zone_id' => $this->delivery_zone_id,
            'delivery_address' => $this->delivery_address,
            'branch_id' => $this->branch_id,
            'status' => $this->status?->value,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'full_name' => $this->student->full_name,
                'file_number' => $this->student->file_number,
            ]),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'delivery_zone' => $this->whenLoaded('deliveryZone', fn () => [
                'id' => $this->deliveryZone->id,
                'name' => $this->deliveryZone->name,
                'fee' => $this->deliveryZone->fee,
            ]),
            'branch' => $this->whenLoaded('branch', fn () => [
                'id' => $this->branch->id,
                'name' => $this->branch->name,
            ]),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
