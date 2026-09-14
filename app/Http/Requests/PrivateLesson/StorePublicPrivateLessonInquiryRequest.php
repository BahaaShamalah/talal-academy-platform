<?php

namespace App\Http\Requests\PrivateLesson;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicPrivateLessonInquiryRequest extends FormRequest
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
            'student_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:50'],
            'phone_secondary' => ['required', 'string', 'max:50', 'different:phone'],
            'grade_id' => ['required', 'integer', 'exists:grades,id'],
            'subject_id' => [
                'required',
                'integer',
                Rule::exists('grade_subjects', 'subject_id')->where('grade_id', $this->integer('grade_id')),
            ],
            'hours' => ['required', 'integer', 'min:1', 'max:40'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'student_name.required' => 'اسم الطالب مطلوب.',
            'phone.required' => 'رقم التواصل مطلوب.',
            'phone_secondary.required' => 'رقم التواصل الثاني مطلوب.',
            'phone_secondary.different' => 'رقم التواصل الثاني يجب أن يختلف عن الرقم الأول.',
            'grade_id.required' => 'اختر الصف.',
            'subject_id.required' => 'اختر المادة.',
            'subject_id.exists' => 'المادة غير مرتبطة بالصف المحدد.',
            'hours.required' => 'اختر عدد الساعات المطلوبة.',
        ];
    }
}
