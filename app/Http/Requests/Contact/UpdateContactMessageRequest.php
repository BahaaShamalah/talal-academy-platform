<?php

namespace App\Http\Requests\Contact;

use App\Enums\ContactMessageStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactMessageRequest extends FormRequest
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
            'status' => ['sometimes', 'required', Rule::enum(ContactMessageStatus::class)],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
