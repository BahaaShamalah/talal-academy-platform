<?php

namespace App\Http\Requests\AbsenceAlertThreshold;

use App\Enums\AbsenceAlertLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAbsenceAlertThresholdRequest extends FormRequest
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
            'consecutive_absences_count' => ['required', 'integer', 'min:1', 'unique:absence_alert_thresholds,consecutive_absences_count'],
            'alert_level' => ['required', Rule::enum(AbsenceAlertLevel::class)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
