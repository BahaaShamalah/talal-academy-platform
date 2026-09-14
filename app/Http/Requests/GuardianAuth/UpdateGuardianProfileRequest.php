<?php

namespace App\Http\Requests\GuardianAuth;

use App\Enums\GuardianRelationship;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuardianProfileRequest extends FormRequest
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
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'relationship' => ['sometimes', 'required', Rule::enum(GuardianRelationship::class)],
            'address' => ['nullable', 'string'],
        ];
    }
}
