<?php

namespace App\Http\Resources;

use App\Models\PayrollRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollRun */
class PayrollRunResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $itemsLoaded = $this->relationLoaded('items');

        return [
            'id' => $this->id,
            'period_month' => $this->period_month?->toDateString(),
            'status' => $this->status?->value,
            'created_by' => $this->created_by,
            'finalized_at' => $this->finalized_at,
            'finalized_by' => $this->finalized_by,
            'grand_total' => $this->when(
                $itemsLoaded,
                fn () => round($this->items->sum(fn ($item) => (float) ($item->net_amount ?? 0)), 3)
            ),
            'items' => PayrollItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
