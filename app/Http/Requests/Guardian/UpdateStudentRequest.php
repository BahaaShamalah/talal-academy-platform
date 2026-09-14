<?php

namespace App\Http\Requests\Guardian;

use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
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
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', Rule::enum(Gender::class)],
            'date_of_birth' => [
                'nullable',
                'date',
                'before:today',
                'after_or_equal:'.now()->subYears(100)->toDateString(),
            ],
            'current_grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'file_number' => ['prohibited'],
            'guardian_id' => ['prohibited'],
            'guardian' => ['prohibited'],
        ];
    }
}
