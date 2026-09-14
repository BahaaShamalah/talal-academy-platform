<?php

namespace App\Http\Requests\Guardian;

use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->replace(collect($this->all())->except(['file_number', 'guardian_id', 'guardian'])->all());
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'civil_id' => ['nullable', 'string', 'max:50', 'unique:students,civil_id'],
            'full_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::enum(Gender::class)],
            'nationality' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => [
                'nullable',
                'date',
                'before:today',
                'after_or_equal:'.now()->subYears(100)->toDateString(),
            ],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'current_grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'notes' => ['nullable', 'string'],
            'guardian_id' => ['prohibited'],
            'guardian' => ['prohibited'],
        ];
    }
}
