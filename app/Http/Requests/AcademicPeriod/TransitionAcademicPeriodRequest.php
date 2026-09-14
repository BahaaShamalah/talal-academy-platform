<?php

namespace App\Http\Requests\AcademicPeriod;

use App\Enums\AcademicPeriodStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionAcademicPeriodRequest extends FormRequest
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
            'status' => ['required', Rule::enum(AcademicPeriodStatus::class)],
        ];
    }
}
