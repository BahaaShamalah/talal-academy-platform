<?php

namespace App\Http\Requests\FamilyDiscountRule;

use Illuminate\Foundation\Http\FormRequest;

class StoreFamilyDiscountRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'min_children_count' => ['required', 'integer', 'min:2', 'max:20', 'unique:family_discount_rules,min_children_count'],
            'discount_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
