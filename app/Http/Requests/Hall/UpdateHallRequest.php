<?php

namespace App\Http\Requests\Hall;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHallRequest extends FormRequest
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
            'branch_id' => ['sometimes', 'required', 'integer', 'exists:branches,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1'],
            'order' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
