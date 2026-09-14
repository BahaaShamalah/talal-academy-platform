<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'exam_date' => ['required', 'date'],
            'class_offering_id' => ['required', 'integer', 'exists:class_offerings,id'],
            'max_score' => ['required', 'numeric', 'min:0.01'],
            'period_id' => ['required', 'integer', 'exists:academic_periods,id'],
        ];
    }
}
