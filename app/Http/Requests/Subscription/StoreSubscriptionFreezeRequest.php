<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionFreezeRequest extends FormRequest
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
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:5000'],
            'pauses_installments' => ['sometimes', 'boolean'],
            'pauses_attendance_expectation' => ['sometimes', 'boolean'],
            'extends_subscription' => ['sometimes', 'boolean'],
        ];
    }
}
