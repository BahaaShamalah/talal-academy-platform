<?php

namespace App\Http\Requests\ClassSession;

use Illuminate\Foundation\Http\FormRequest;

class GenerateSessionsRequest extends FormRequest
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
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
        ];
    }
}
