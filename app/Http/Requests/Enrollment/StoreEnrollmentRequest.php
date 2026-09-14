<?php

namespace App\Http\Requests\Enrollment;

use App\Enums\EnrollmentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEnrollmentRequest extends FormRequest
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
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'class_offering_id' => ['required', 'integer', 'exists:class_offerings,id'],
            'status' => ['sometimes', Rule::enum(EnrollmentStatus::class)],
            'enrolled_at' => ['sometimes', 'date'],
        ];
    }
}
