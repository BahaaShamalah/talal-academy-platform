<?php

namespace App\Http\Requests\PrivateLesson;

use Illuminate\Foundation\Http\FormRequest;

class StoreGuardianPrivateLessonBookingRequest extends FormRequest
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
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'private_lesson_offer_id' => ['required', 'integer', 'exists:private_lesson_offers,id'],
            'private_lesson_slot_id' => ['nullable', 'integer', 'exists:private_lesson_slots,id'],
            'preferred_period_id' => ['nullable', 'string', 'max:50'],
            'preferred_period_name' => ['nullable', 'string', 'max:100'],
            'preferred_start_time' => ['nullable', 'date_format:H:i'],
            'preferred_end_time' => ['nullable', 'date_format:H:i'],
        ];
    }
}
