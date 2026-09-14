<?php

namespace App\Http\Requests\PrivateLesson;

use App\Enums\PrivateLessonInquiryStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePrivateLessonInquiryRequest extends FormRequest
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
            'status' => ['sometimes', 'required', Rule::enum(PrivateLessonInquiryStatus::class)],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
