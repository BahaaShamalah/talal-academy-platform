<?php

namespace App\Http\Requests\InstallmentTemplate;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstallmentTemplateRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'number_of_installments' => ['sometimes', 'integer', 'min:2', 'max:24'],
            'split_percentages' => ['sometimes', 'array', 'min:2'],
            'split_percentages.*' => ['required_with:split_percentages', 'numeric', 'min:0'],
            'due_offset_days' => ['sometimes', 'array', 'min:2'],
            'due_offset_days.*' => ['required_with:due_offset_days', 'integer', 'min:0'],
        ];
    }
}
