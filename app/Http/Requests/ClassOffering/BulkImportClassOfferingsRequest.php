<?php

namespace App\Http\Requests\ClassOffering;

use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkImportClassOfferingsRequest extends FormRequest
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
            'force_all' => ['sometimes', 'boolean'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.grade_id' => ['required', 'integer', 'exists:grades,id'],
            'rows.*.grade_section_id' => ['nullable', 'integer', 'exists:grade_sections,id'],
            'rows.*.grade_section_name' => ['nullable', 'string', 'max:255'],
            'rows.*.subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'rows.*.teacher_id' => ['required', 'integer', 'exists:users,id'],
            'rows.*.hall_id' => ['required', 'integer', 'exists:halls,id'],
            'rows.*.gender' => ['required', Rule::enum(Gender::class)],
            'rows.*.schedules' => ['required', 'array', 'min:1'],
            'rows.*.schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'rows.*.schedules.*.start_time' => ['required', 'date_format:H:i'],
            'rows.*.schedules.*.end_time' => ['required', 'date_format:H:i'],
        ];
    }
}
