<?php

namespace App\Http\Requests\PrivateLesson;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmPrivateLessonBookingRequest extends FormRequest
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
            'private_lesson_slot_id' => ['sometimes', 'nullable', 'integer', 'exists:private_lesson_slots,id'],
        ];
    }
}
