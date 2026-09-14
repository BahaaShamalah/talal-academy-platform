<?php

namespace App\Http\Requests\StaffProfile;

use Illuminate\Foundation\Http\FormRequest;

class SyncStaffQualificationsRequest extends FormRequest
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
            'subject_ids' => ['present', 'array'],
            'subject_ids.*' => ['integer', 'distinct', 'exists:subjects,id'],
            'grade_ids' => ['present', 'array'],
            'grade_ids.*' => ['integer', 'distinct', 'exists:grades,id'],
        ];
    }
}
