<?php

namespace App\Http\Requests\Invoice;

use App\Enums\RefundMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProcessRefundRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:0.001'],
            'method' => ['required', Rule::enum(RefundMethod::class)],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
