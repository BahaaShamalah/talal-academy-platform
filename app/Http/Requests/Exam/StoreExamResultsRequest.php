<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamResultsRequest extends FormRequest
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
            'results' => ['required', 'array', 'min:1'],
            'results.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'results.*.score' => ['nullable', 'numeric', 'min:0'],
            'results.*.teacher_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
