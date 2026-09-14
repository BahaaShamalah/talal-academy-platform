<?php

namespace App\Http\Requests\PrivateLesson;

use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePrivateLessonOfferRequest extends FormRequest
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
            'grade_id' => ['sometimes', 'required', 'integer', 'exists:grades,id'],
            'subject_id' => ['sometimes', 'required', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'duration_minutes' => ['sometimes', 'required', 'integer', 'min:15', 'max:480'],
            'session_type' => ['sometimes', 'required', Rule::enum(PrivateLessonSessionType::class)],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'max_students' => ['sometimes', 'nullable', 'integer', 'min:2'],
            'status' => ['sometimes', Rule::enum(PrivateLessonOfferStatus::class)],
            'image_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media,id'],
        ];
    }
}
