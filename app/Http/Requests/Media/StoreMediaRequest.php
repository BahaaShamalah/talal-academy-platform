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
            // Input file from the user (source image) — not the storage/output format.
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:jpg,jpeg,png,webp,gif',
            ],
            'alt_text' => ['nullable', 'string', 'max:255'],
            // Output encoding only (MediaService conversion target). Separate from input mimes.
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
            'file.mimes' => 'يُسمح فقط بصور JPG أو PNG أو WebP أو GIF كملف مدخل.',
            'force_format.in' => 'صيغة التخزين force_format المسموحة: avif أو webp أو jpeg أو png.',
        ];
    }
}
