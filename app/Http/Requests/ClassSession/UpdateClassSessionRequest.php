<?php

namespace App\Http\Requests\ClassSession;

use App\Models\ClassSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateClassSessionRequest extends FormRequest
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
            'teacher_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'hall_id' => ['sometimes', 'required', 'integer', 'exists:halls,id'],
            'session_date' => ['sometimes', 'required', 'date'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'force' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var ClassSession $session */
            $session = $this->route('session');

            $start = $this->input('start_time', substr((string) $session->start_time, 0, 5));
            $end = $this->input('end_time', substr((string) $session->end_time, 0, 5));

            if ($start && $end && $end <= $start) {
                $validator->errors()->add('end_time', 'The end time must be after the start time.');
            }

            if (! $this->hasAny(['teacher_id', 'hall_id', 'session_date', 'start_time', 'end_time'])) {
                $validator->errors()->add('session', 'يجب تمرير حقل واحد على الأقل للتعديل.');
            }
        });
    }
}
