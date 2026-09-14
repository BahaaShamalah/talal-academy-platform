<?php

namespace App\Http\Requests\ClassSession;

use Illuminate\Foundation\Http\FormRequest;

class CancelClassSessionRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:2', 'max:1000'],
        ];
    }
}
