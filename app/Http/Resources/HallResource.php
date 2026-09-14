<?php

namespace App\Http\Resources;

use App\Models\Hall;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Hall */
class HallResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'name' => $this->name,
            'capacity' => $this->capacity,
            'order' => $this->order,
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
