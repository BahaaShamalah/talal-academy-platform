<?php

namespace App\Http\Requests\Student;

use App\Enums\Gender;
use App\Enums\StudentStatus;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->replace(collect($this->all())->except(['file_number', 'guardian'])->all());
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Student $student */
        $student = $this->route('student');

        return [
            'civil_id' => ['nullable', 'string', 'max:50', Rule::unique('students', 'civil_id')->ignore($student->id)],
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', Rule::enum(Gender::class)],
            'nationality' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => [
                'nullable',
                'date',
                'before:today',
                'after_or_equal:'.now()->subYears(100)->toDateString(),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'previous_school' => ['sometimes', 'required', 'string', 'max:255'],
            'current_grade_id' => ['sometimes', 'required', 'integer', 'exists:grades,id'],
            'guardian_id' => ['nullable', 'integer', 'exists:guardians,id'],
            'photo_path' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', Rule::enum(StudentStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
