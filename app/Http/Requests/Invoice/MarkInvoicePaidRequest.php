<?php

namespace App\Http\Requests\Invoice;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkInvoicePaidRequest extends FormRequest
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
            'payment_method' => [
                'required',
                Rule::in([
                    PaymentMethod::Cash->value,
                    PaymentMethod::ManualTransfer->value,
                ]),
            ],
        ];
    }
}
