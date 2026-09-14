<?php

namespace App\Http\Requests\PrivateLesson;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePrivateLessonSlotRequest extends FormRequest
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
            'day_of_week' => ['nullable', 'integer', 'between:0,6'],
            'specific_date' => ['nullable', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasDay = $this->filled('day_of_week');
            $hasDate = $this->filled('specific_date');

            if ($hasDay === $hasDate) {
                $validator->errors()->add('day_of_week', 'حدّد day_of_week أو specific_date، وليس الاثنين معًا ولا بدون أي منهما.');
            }
        });
    }
}
