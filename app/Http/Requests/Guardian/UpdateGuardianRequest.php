<?php

namespace App\Http\Requests\Guardian;

use App\Enums\GuardianRelationship;
use App\Models\Guardian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuardianRequest extends FormRequest
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
        /** @var Guardian $guardian */
        $guardian = $this->route('guardian');

        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'civil_id' => ['nullable', 'string', 'max:50', Rule::unique('guardians', 'civil_id')->ignore($guardian->id)],
            'phone' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('guardians', 'phone')->ignore($guardian->id)],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'relationship' => ['sometimes', 'required', Rule::enum(GuardianRelationship::class)],
            'address' => ['nullable', 'string'],
        ];
    }
}
