<?php

namespace App\Http\Requests\PlanDuration;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanDurationRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.',
        ];
    }
}
