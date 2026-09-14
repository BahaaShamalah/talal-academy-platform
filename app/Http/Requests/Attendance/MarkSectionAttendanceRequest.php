<?php

namespace App\Http\Requests\Attendance;

use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkSectionAttendanceRequest extends FormRequest
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
            'date' => ['required', 'date_format:Y-m-d'],
            'grade_section_id' => ['nullable', 'integer', 'exists:grade_sections,id'],
            'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'records.*.status' => [
                'required',
                Rule::enum(AttendanceStatus::class)->except([AttendanceStatus::Pending]),
            ],
            'records.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
