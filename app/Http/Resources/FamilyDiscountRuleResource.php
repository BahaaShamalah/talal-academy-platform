<?php

namespace App\Http\Resources;

use App\Models\FamilyDiscountRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FamilyDiscountRule */
class FamilyDiscountRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'min_children_count' => $this->min_children_count,
            'discount_percentage' => $this->discount_percentage,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
