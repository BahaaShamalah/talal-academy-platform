<?php

namespace App\Http\Resources;

use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Branch */
class BranchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'country' => $this->country,
            'city' => $this->city,
            'address' => $this->address,
            'phone_1' => $this->phone_1,
            'phone_2' => $this->phone_2,
            'is_main' => (bool) $this->is_main,
            'halls_count' => $this->whenCounted('halls'),
            'halls' => HallResource::collection($this->whenLoaded('halls')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
