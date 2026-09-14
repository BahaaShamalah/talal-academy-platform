<?php

namespace App\Http\Requests\ClassOffering;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClassOfferingRequest extends FormRequest
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
            'hall_id' => ['required', 'integer', 'exists:halls,id'],
            'period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'grade_section_id' => ['nullable', 'integer', 'exists:grade_sections,id'],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'status' => ['sometimes', Rule::enum(ClassOfferingStatus::class)],
        ];
    }
}
