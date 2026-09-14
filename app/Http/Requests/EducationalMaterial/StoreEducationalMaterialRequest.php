<?php

namespace App\Http\Requests\EducationalMaterial;

use App\Enums\EducationalMaterialScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEducationalMaterialRequest extends FormRequest
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
        $scope = $this->input('scope');

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'media_id' => ['required', 'integer', 'exists:media,id'],
            'scope' => ['required', Rule::enum(EducationalMaterialScope::class)],
            'grade_id' => [
                Rule::requiredIf($scope === EducationalMaterialScope::General->value),
                'nullable',
                'integer',
                'exists:grades,id',
            ],
            'subject_id' => [
                Rule::requiredIf($scope === EducationalMaterialScope::General->value),
                'nullable',
                'integer',
                'exists:subjects,id',
            ],
            'student_id' => [
                Rule::requiredIf($scope === EducationalMaterialScope::Targeted->value),
                'nullable',
                'integer',
                'exists:students,id',
                'prohibited_if:scope,'.EducationalMaterialScope::General->value,
            ],
            'class_offering_id' => ['nullable', 'integer', 'exists:class_offerings,id'],
            'period_id' => ['required', 'integer', 'exists:academic_periods,id'],
        ];
    }
}
