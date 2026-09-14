<?php

namespace App\Http\Requests\ClassSession;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreMakeupSessionRequest extends FormRequest
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
            'session_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'teacher_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'hall_id' => ['sometimes', 'nullable', 'integer', 'exists:halls,id'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer', 'exists:students,id'],
            'force' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $start = $this->input('start_time');
            $end = $this->input('end_time');

            if ($start && $end && $end <= $start) {
                $validator->errors()->add('end_time', 'The end time must be after the start time.');
            }
        });
    }
}
