<?php

namespace App\Http\Requests\Plan;

use App\Enums\PlanDurationStatus;
use App\Enums\PlanDurationType;
use App\Http\Requests\Concerns\ValidatesPlanByProductType;
use App\Models\PlanDuration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePlanRequest extends FormRequest
{
    use ValidatesPlanByProductType;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_merge($this->productTypeFieldRules(false), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_type' => ['required', Rule::enum(PlanDurationType::class)],
            'duration_academic_period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'duration_period_id' => [
                'nullable',
                'integer',
                'exists:plan_durations,id',
                Rule::requiredIf(
                    fn () => $this->input('duration_type') === PlanDurationType::FixedPeriod->value
                        && ! $this->input('duration_academic_period_id')
                ),
            ],
            'price' => ['required', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'installment_template_id' => ['nullable', 'integer', 'exists:installment_templates,id'],
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateAgainstProductType($validator, false);

            if ($this->input('duration_type') !== PlanDurationType::FixedPeriod->value) {
                return;
            }

            if ($this->input('duration_academic_period_id')) {
                return;
            }

            $periodId = $this->input('duration_period_id');
            if (! $periodId) {
                return;
            }

            $period = PlanDuration::query()->find($periodId);
            if ($period && $period->status === PlanDurationStatus::Expired->value) {
                $validator->errors()->add(
                    'duration_period_id',
                    'هذه المدة منتهية، اختر مدة أخرى',
                );
            }
        });
    }
}
