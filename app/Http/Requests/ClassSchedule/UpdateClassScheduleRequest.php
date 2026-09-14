<?php

namespace App\Http\Requests\ClassSchedule;

use App\Models\ClassSchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateClassScheduleRequest extends FormRequest
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
            'class_offering_id' => ['sometimes', 'required', 'integer', 'exists:class_offerings,id'],
            'day_of_week' => ['sometimes', 'required', 'integer', 'between:0,6'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'teacher_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'hall_id' => ['sometimes', 'required', 'integer', 'exists:halls,id'],
            'force' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var ClassSchedule $schedule */
            $schedule = $this->route('class_schedule');

            $start = $this->input('start_time', substr((string) $schedule->start_time, 0, 5));
            $end = $this->input('end_time', substr((string) $schedule->end_time, 0, 5));

            if ($start && $end && $end <= $start) {
                $validator->errors()->add('end_time', 'The end time must be after the start time.');
            }
        });
    }
}
