<?php

namespace App\Http\Requests\Enrollment;

use App\Enums\EnrollmentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnrollmentRequest extends FormRequest
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
            'class_offering_id' => ['sometimes', 'required', 'integer', 'exists:class_offerings,id'],
            'status' => ['sometimes', 'required', Rule::enum(EnrollmentStatus::class)],
        ];
    }
}
