<?php

namespace App\Http\Requests\Student;

use App\Enums\Gender;
use App\Enums\GuardianRelationship;
use App\Enums\StudentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->replace(collect($this->all())->except('file_number')->all());
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
            'phone' => ['nullable', 'string', 'max:50'],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'previous_school' => ['required', 'string', 'max:255'],
            'current_grade_id' => ['required', 'integer', 'exists:grades,id'],
            'guardian_id' => ['nullable', 'integer', 'exists:guardians,id', 'prohibited_with:guardian'],
            'guardian' => ['nullable', 'array', 'prohibited_with:guardian_id'],
            'guardian.full_name' => ['required_with:guardian', 'string', 'max:255'],
            'guardian.civil_id' => ['nullable', 'string', 'max:50', 'unique:guardians,civil_id'],
            'guardian.phone' => ['required_with:guardian', 'string', 'max:50'],
            'guardian.phone_secondary' => ['nullable', 'string', 'max:50'],
            'guardian.email' => ['nullable', 'email', 'max:255'],
            'guardian.relationship' => ['required_with:guardian', Rule::enum(GuardianRelationship::class)],
            'guardian.address' => ['nullable', 'string'],
            'photo_path' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', Rule::enum(StudentStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->filled('guardian_id') && ! $this->filled('guardian')) {
                $validator->errors()->add(
                    'guardian',
                    'يجب تحديد ولي أمر موجود أو إنشاء ولي أمر جديد.',
                );
            }

            if ($this->filled('guardian_id') && $this->filled('guardian')) {
                $validator->errors()->add(
                    'guardian_id',
                    'أرسل إما guardian_id لولي أمر موجود أو guardian لإنشاء ولي أمر جديد، وليس الاثنين معاً.',
                );
            }
        });
    }
}
