<?php

namespace App\Http\Requests\StaffProfile;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffDocumentRequest extends FormRequest
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
            'media_id' => ['required', 'integer', 'exists:media,id'],
            'document_type' => ['required', 'string', 'max:255'],
        ];
    }
}
