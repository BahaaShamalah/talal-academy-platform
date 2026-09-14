<?php

namespace App\Http\Requests\GradeSection;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGradeSectionRequest extends FormRequest
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
            'period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'gender' => ['sometimes', 'nullable', Rule::enum(Gender::class)],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::enum(ClassOfferingStatus::class)],
        ];
    }
}
