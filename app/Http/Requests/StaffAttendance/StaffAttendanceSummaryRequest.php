<?php

namespace App\Http\Requests\StaffAttendance;

use Illuminate\Foundation\Http\FormRequest;

class StaffAttendanceSummaryRequest extends FormRequest
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
            'month' => ['required', 'date_format:Y-m'],
        ];
    }
}
