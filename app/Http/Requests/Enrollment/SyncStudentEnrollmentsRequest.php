<?php

namespace App\Http\Requests\Enrollment;

use App\Enums\EnrollmentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncStudentEnrollmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assignments' => ['present', 'array'],
            'assignments.*.class_offering_id' => ['required', 'integer', 'exists:class_offerings,id'],
            'assignments.*.status' => ['required', Rule::enum(EnrollmentStatus::class)],
        ];
    }
}
