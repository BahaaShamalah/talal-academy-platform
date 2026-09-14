<?php

namespace App\Http\Requests\EducationalStage;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEducationalStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'order' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
