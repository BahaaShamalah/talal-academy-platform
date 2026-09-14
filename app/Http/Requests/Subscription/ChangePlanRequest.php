<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;

class ChangePlanRequest extends FormRequest
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
            'new_plan_id' => ['required', 'integer', 'exists:plans,id'],
            'manual_amount_override' => ['nullable', 'numeric'],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
