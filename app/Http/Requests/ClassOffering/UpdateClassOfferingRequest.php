<?php

namespace App\Http\Requests\ClassOffering;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClassOfferingRequest extends FormRequest
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
            'grade_id' => ['sometimes', 'integer', 'exists:grades,id'],
            'subject_id' => ['sometimes', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['sometimes', 'integer', 'exists:users,id'],
            'hall_id' => ['sometimes', 'integer', 'exists:halls,id'],
            'period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'grade_section_id' => ['sometimes', 'nullable', 'integer', 'exists:grade_sections,id'],
            'gender' => ['sometimes', 'nullable', Rule::enum(Gender::class)],
            'status' => ['sometimes', Rule::enum(ClassOfferingStatus::class)],
        ];
    }
}
