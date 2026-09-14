<?php

namespace App\Http\Resources;

use App\Models\InstallmentTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InstallmentTemplate */
class InstallmentTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'number_of_installments' => $this->number_of_installments,
            'split_percentages' => $this->split_percentages,
            'due_offset_days' => $this->due_offset_days,
            'plans_count' => $this->whenCounted('plans'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
