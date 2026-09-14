<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstituteSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'institute_name_ar' => ['sometimes', 'required', 'string', 'max:255'],
            'institute_name_en' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'commercial_registration_number' => ['nullable', 'string', 'max:100'],
            'invoice_footer_note' => ['nullable', 'string'],
            'director_name' => ['nullable', 'string', 'max:255'],
            'private_lesson_periods' => ['sometimes', 'array'],
            'private_lesson_periods.*.id' => ['required', 'string', 'max:50'],
            'private_lesson_periods.*.name_ar' => ['required', 'string', 'max:100'],
            'private_lesson_periods.*.start_time' => ['required', 'date_format:H:i'],
            'private_lesson_periods.*.end_time' => ['required', 'date_format:H:i'],
            'private_lesson_periods.*.is_active' => ['sometimes', 'boolean'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'stamp' => ['nullable', 'image', 'max:2048'],
            'logo_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'stamp_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'remove_logo' => ['sometimes', 'boolean'],
            'remove_stamp' => ['sometimes', 'boolean'],
        ];
    }
}
