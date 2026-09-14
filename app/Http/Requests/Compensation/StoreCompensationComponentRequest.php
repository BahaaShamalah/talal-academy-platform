<?php

namespace App\Http\Requests\Compensation;

use App\Enums\CompensationComponentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompensationComponentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'component_type' => ['required', Rule::enum(CompensationComponentType::class)],
            'amount' => ['required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        ];
    }
}
