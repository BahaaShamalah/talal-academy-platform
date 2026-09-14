<?php

namespace App\Http\Requests\StaffProfile;

use App\Enums\ContractType;
use App\Models\StaffProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertStaffProfileRequest extends FormRequest
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
        $user = $this->route('user');
        $profileId = $user
            ? StaffProfile::query()->where('user_id', $user->id)->value('id')
            : null;

        return [
            'civil_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('staff_profiles', 'civil_id')->ignore($profileId),
            ],
            'date_of_birth' => ['nullable', 'date'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'contract_start_date' => ['nullable', 'date'],
            'contract_end_date' => ['nullable', 'date', 'after_or_equal:contract_start_date'],
            'contract_type' => ['nullable', Rule::enum(ContractType::class)],
            'notes' => ['nullable', 'string'],
            'expected_start_time' => ['nullable', 'date_format:H:i'],
            'expected_end_time' => ['nullable', 'date_format:H:i'],
        ];
    }
}
