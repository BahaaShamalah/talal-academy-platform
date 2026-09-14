<?php

namespace App\Http\Requests\PrivateLesson;

use App\Models\PrivateLessonSlot;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdatePrivateLessonSlotRequest extends FormRequest
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
            'day_of_week' => ['sometimes', 'nullable', 'integer', 'between:0,6'],
            'specific_date' => ['sometimes', 'nullable', 'date'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var PrivateLessonSlot $slot */
            $slot = $this->route('slot');

            $day = $this->has('day_of_week')
                ? $this->input('day_of_week')
                : $slot->day_of_week;
            $date = $this->has('specific_date')
                ? $this->input('specific_date')
                : $slot->specific_date?->toDateString();

            $hasDay = $day !== null && $day !== '';
            $hasDate = $date !== null && $date !== '';

            if ($hasDay && $hasDate) {
                $validator->errors()->add('day_of_week', 'حدّد day_of_week أو specific_date، وليس الاثنين معًا.');
            }

            if (! $hasDay && ! $hasDate) {
                $validator->errors()->add('day_of_week', 'يجب تحديد day_of_week أو specific_date.');
            }

            $start = $this->input('start_time', substr((string) $slot->start_time, 0, 5));
            $end = $this->input('end_time', substr((string) $slot->end_time, 0, 5));
            if ($start && $end && $end <= $start) {
                $validator->errors()->add('end_time', 'وقت النهاية يجب أن يكون بعد وقت البداية.');
            }
        });
    }
}
