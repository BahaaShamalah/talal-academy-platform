<?php

namespace App\Http\Requests\AbsenceAlertThreshold;

use App\Enums\AbsenceAlertLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAbsenceAlertThresholdRequest extends FormRequest
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
        $thresholdId = $this->route('absence_alert_threshold')?->id
            ?? $this->route('threshold')?->id;

        return [
            'consecutive_absences_count' => [
                'sometimes',
                'integer',
                'min:1',
                Rule::unique('absence_alert_thresholds', 'consecutive_absences_count')->ignore($thresholdId),
            ],
            'alert_level' => ['sometimes', Rule::enum(AbsenceAlertLevel::class)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
