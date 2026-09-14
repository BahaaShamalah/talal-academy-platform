<?php

namespace App\Http\Requests\MarketingSection;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMarketingSectionRequest extends FormRequest
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
            'content' => ['sometimes', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
