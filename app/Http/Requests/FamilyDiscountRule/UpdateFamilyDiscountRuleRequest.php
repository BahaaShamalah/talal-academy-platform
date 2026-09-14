<?php

namespace App\Http\Requests\FamilyDiscountRule;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFamilyDiscountRuleRequest extends FormRequest
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
        $ruleId = $this->route('family_discount_rule')?->id;

        return [
            'min_children_count' => [
                'sometimes',
                'integer',
                'min:2',
                'max:20',
                Rule::unique('family_discount_rules', 'min_children_count')->ignore($ruleId),
            ],
            'discount_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
