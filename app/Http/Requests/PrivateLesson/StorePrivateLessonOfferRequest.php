<?php

namespace App\Http\Requests\PrivateLesson;

use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePrivateLessonOfferRequest extends FormRequest
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
            'grade_id' => ['required', 'integer', 'exists:grades,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'duration_minutes' => ['required', 'integer', 'min:15', 'max:480'],
            'session_type' => ['required', Rule::enum(PrivateLessonSessionType::class)],
            'price' => ['required', 'numeric', 'min:0'],
            'max_students' => [
                'nullable',
                'integer',
                'min:2',
                Rule::requiredIf(fn () => $this->input('session_type') === PrivateLessonSessionType::Group->value),
                Rule::prohibitedIf(fn () => $this->input('session_type') === PrivateLessonSessionType::Individual->value),
            ],
            'status' => ['sometimes', Rule::enum(PrivateLessonOfferStatus::class)],
            'image_media_id' => ['nullable', 'integer', 'exists:media,id'],
        ];
    }
}
