<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;

class SubscribeStudentRequest extends FormRequest
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
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'selected_subject_ids' => ['nullable', 'array'],
            'selected_subject_ids.*' => ['integer', 'exists:subjects,id'],
            'payment_mode' => ['nullable', 'string', 'in:full,installment'],
            'apply_credit' => ['sometimes', 'boolean'],
        ];
    }
}
