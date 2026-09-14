<?php

namespace App\Http\Requests\MarketingSection;

use Illuminate\Foundation\Http\FormRequest;

class StoreMarketingSectionRequest extends FormRequest
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
            'section_key' => ['required', 'string', 'max:64', 'unique:marketing_sections,section_key'],
            'content' => ['required', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
