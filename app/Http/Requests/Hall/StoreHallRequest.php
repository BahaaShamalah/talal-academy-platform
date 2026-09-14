<?php

namespace App\Http\Requests\Hall;

use Illuminate\Foundation\Http\FormRequest;

class StoreHallRequest extends FormRequest
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
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
