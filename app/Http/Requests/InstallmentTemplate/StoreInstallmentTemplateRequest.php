<?php

namespace App\Http\Requests\InstallmentTemplate;

use Illuminate\Foundation\Http\FormRequest;

class StoreInstallmentTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'number_of_installments' => ['required', 'integer', 'min:2', 'max:24'],
            'split_percentages' => ['required', 'array', 'min:2'],
            'split_percentages.*' => ['required', 'numeric', 'min:0'],
            'due_offset_days' => ['required', 'array', 'min:2'],
            'due_offset_days.*' => ['required', 'integer', 'min:0'],
        ];
    }
}
