<?php

namespace App\Http\Requests\Leave;

use App\Enums\LeaveRequestStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewLeaveRequest extends FormRequest
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
            'decision' => ['required', Rule::in([
                LeaveRequestStatus::Approved->value,
                LeaveRequestStatus::Rejected->value,
            ])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
