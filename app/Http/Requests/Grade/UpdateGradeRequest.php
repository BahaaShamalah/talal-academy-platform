<?php

namespace App\Http\Requests\Grade;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGradeRequest extends FormRequest
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
            'educational_stage_id' => ['sometimes', 'required', 'integer', 'exists:educational_stages,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'order' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
