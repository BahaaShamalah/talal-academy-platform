<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;

class StoreMediaRequest extends FormRequest
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
            'file' => ['required', 'file', 'max:10240'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'force_format' => ['nullable', 'string', 'in:avif,webp,jpeg,png'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'يجب اختيار صورة للرفع.',
            'file.file' => 'الملف المرفوع غير صالح.',
            'file.max' => 'حجم الصورة أكبر من المسموح (الحد الأقصى 10 ميغابايت).',
        ];
    }
}
