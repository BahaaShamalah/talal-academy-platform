<?php

namespace App\Http\Requests\StaffAttendance;

use App\Enums\StaffAttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffAttendanceRequest extends FormRequest
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
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'date' => ['required', 'date'],
            'check_in_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'check_out_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'status' => ['sometimes', Rule::enum(StaffAttendanceStatus::class)],
            'late_minutes' => ['nullable', 'integer', 'min:0'],
            'overtime_minutes' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
