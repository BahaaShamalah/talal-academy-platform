<?php

namespace App\Http\Requests\Coupon;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCouponRequest extends FormRequest
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
        /** @var Coupon $coupon */
        $coupon = $this->route('coupon');

        return [
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('coupons', 'code')->ignore($coupon->id)],
            'type' => ['sometimes', 'required', Rule::enum(CouponType::class)],
            'value' => ['sometimes', 'required', 'numeric', 'min:0'],
            'scope' => ['sometimes', 'required', Rule::enum(CouponScope::class)],
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
            /** @var Coupon $coupon */
            $coupon = $this->route('coupon');

            $type = $this->input('type', $coupon->type?->value);
            $value = (float) $this->input('value', $coupon->value);

            if ($type === CouponType::Percentage->value && ($value < 0 || $value > 100)) {
                $validator->errors()->add('value', 'نسبة الخصم يجب أن تكون بين 0 و 100.');
            }

            $scope = $this->input('scope', $coupon->scope?->value);
            $gradeId = $this->exists('grade_id') ? $this->input('grade_id') : $coupon->grade_id;
            $planId = $this->exists('plan_id') ? $this->input('plan_id') : $coupon->plan_id;

            if ($scope === CouponScope::SpecificGrade->value && empty($gradeId)) {
                $validator->errors()->add('grade_id', 'الصف مطلوب عند تحديد نطاق صف معيّن.');
            }

            if ($scope === CouponScope::SpecificPlan->value && empty($planId)) {
                $validator->errors()->add('plan_id', 'الباقة مطلوبة عند تحديد نطاق باقة معيّنة.');
            }
        });
    }
}
