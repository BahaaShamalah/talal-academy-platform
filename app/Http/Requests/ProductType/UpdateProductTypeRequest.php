<?php

namespace App\Http\Requests\ProductType;

use App\Enums\SubjectSelectionMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductTypeRequest extends FormRequest
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
            'name_ar' => ['sometimes', 'required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject_selection_mode' => ['sometimes', 'required', Rule::enum(SubjectSelectionMode::class)],
            'requires_grade' => ['sometimes', 'boolean'],
            'is_schedulable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'key' => ['prohibited'],
        ];
    }
}
