<?php

namespace App\Http\Requests\Guardian;

use App\Enums\GuardianRelationship;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuardianRequest extends FormRequest
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
            'full_name' => ['required', 'string', 'max:255'],
            'civil_id' => ['nullable', 'string', 'max:50', 'unique:guardians,civil_id'],
            'phone' => ['required', 'string', 'max:50', 'unique:guardians,phone'],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'relationship' => ['required', Rule::enum(GuardianRelationship::class)],
            'address' => ['nullable', 'string'],
        ];
    }
}
