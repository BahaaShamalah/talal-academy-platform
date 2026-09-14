<?php

namespace App\Http\Requests\Coupon;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => strtoupper(trim((string) $this->input('code')))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'type' => ['required', Rule::enum(CouponType::class)],
            'value' => ['required', 'numeric', 'min:0'],
            'scope' => ['required', Rule::enum(CouponScope::class)],
            'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'plan_id' => ['nullable', 'integer', 'exists:plans,id'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'min_purchase_amount' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $type = $this->input('type');
            $value = (float) $this->input('value', 0);

            if ($type === CouponType::Percentage->value && ($value < 0 || $value > 100)) {
                $validator->errors()->add('value', 'نسبة الخصم يجب أن تكون بين 0 و 100.');
            }

            $scope = $this->input('scope');

            if ($scope === CouponScope::SpecificGrade->value && ! $this->filled('grade_id')) {
                $validator->errors()->add('grade_id', 'الصف مطلوب عند تحديد نطاق صف معيّن.');
            }

            if ($scope === CouponScope::SpecificPlan->value && ! $this->filled('plan_id')) {
                $validator->errors()->add('plan_id', 'الباقة مطلوبة عند تحديد نطاق باقة معيّنة.');
            }
        });
    }
}
