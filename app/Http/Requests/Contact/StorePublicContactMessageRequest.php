<?php

namespace App\Http\Requests\Contact;

use App\Support\KuwaitPhone;
use Illuminate\Foundation\Http\FormRequest;

class StorePublicContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => KuwaitPhone::normalize($this->input('phone')),
            'phone_secondary' => KuwaitPhone::normalize($this->input('phone_secondary')),
            'educational_stage_id' => $this->input('educational_stage_id') ?: $this->input('stage_id') ?: $this->input('stage') ?: null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'size:8'],
            'phone_secondary' => ['nullable', 'string', 'size:8', 'different:phone'],
            'educational_stage_id' => ['nullable', 'integer', 'exists:educational_stages,id'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'الاسم مطلوب.',
            'phone.required' => 'رقم الواتساب مطلوب.',
            'phone.size' => 'رقم الواتساب يجب أن يكون 8 أرقام بعد +965.',
            'phone_secondary.size' => 'الرقم الثاني يجب أن يكون 8 أرقام بعد +965.',
            'phone_secondary.different' => 'الرقم الثاني يجب أن يختلف عن رقم الواتساب.',
        ];
    }
}
