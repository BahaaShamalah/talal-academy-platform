<?php

namespace App\Http\Requests\GradeSection;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGradeSectionRequest extends FormRequest
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
            'period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::enum(ClassOfferingStatus::class)],
        ];
    }
}
