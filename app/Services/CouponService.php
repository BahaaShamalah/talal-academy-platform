<?php

namespace App\Services;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Models\Coupon;
use App\Models\Plan;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class CouponService
{
    /**
     * @return LengthAwarePaginator<int, Coupon>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Coupon::class)
            ->allowedFilters(
                AllowedFilter::exact('code'),
                AllowedFilter::exact('type'),
                AllowedFilter::exact('scope'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::exact('grade_id'),
                AllowedFilter::exact('plan_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('plan'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Coupon
    {
        return Coupon::query()->create($this->normalizePayload($data));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Coupon $coupon, array $data): Coupon
    {
        $coupon->update($this->normalizePayload($data, $coupon));

        return $coupon->refresh();
    }

    public function delete(Coupon $coupon): void
    {
        if ($coupon->invoices()->exists()) {
            throw ValidationException::withMessages([
                'coupon' => ['لا يمكن حذف كوبون مرتبط بفواتير.'],
            ]);
        }

        $coupon->delete();
    }

    /**
     * @return array{coupon: Coupon, discount_amount: string}
     */
    public function validateAndApply(string $code, Plan $plan, bool $lockForUpdate = false): array
    {
        $normalized = strtoupper(trim($code));

        $query = Coupon::query()->where('code', $normalized);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $coupon = $query->first();

        if (! $coupon || ! $coupon->is_active) {
            throw ValidationException::withMessages([
                'coupon_code' => ['الكوبون غير موجود أو غير مفعّل'],
            ]);
        }

        $today = now()->startOfDay();

        if ($coupon->valid_from && $today->lt($coupon->valid_from->copy()->startOfDay())) {
            throw ValidationException::withMessages([
                'coupon_code' => ['الكوبون لم يبدأ بعد'],
            ]);
        }

        if ($coupon->valid_until && $today->gt($coupon->valid_until->copy()->startOfDay())) {
            throw ValidationException::withMessages([
                'coupon_code' => ['الكوبون منتهي الصلاحية'],
            ]);
        }

        if ($coupon->max_uses !== null && $coupon->used_count >= $coupon->max_uses) {
            throw ValidationException::withMessages([
                'coupon_code' => ['تم استنفاد عدد مرات استخدام هذا الكوبون'],
            ]);
        }

        if ($coupon->scope === CouponScope::SpecificGrade) {
            $couponGradeId = (int) $coupon->grade_id;
            $matches = $plan->grade_id
                ? (int) $plan->grade_id === $couponGradeId
                : $plan->coversGradeId($couponGradeId);

            if (! $matches) {
                throw ValidationException::withMessages([
                    'coupon_code' => ['هذا الكوبون غير صالح لهذه الباقة'],
                ]);
            }
        }

        if ($coupon->scope === CouponScope::SpecificPlan) {
            if ((int) $plan->id !== (int) $coupon->plan_id) {
                throw ValidationException::withMessages([
                    'coupon_code' => ['هذا الكوبون غير صالح لهذه الباقة'],
                ]);
            }
        }

        $planPrice = (float) $plan->price;

        if ($coupon->min_purchase_amount !== null && $planPrice < (float) $coupon->min_purchase_amount) {
            $min = number_format((float) $coupon->min_purchase_amount, 3, '.', '');
            throw ValidationException::withMessages([
                'coupon_code' => ["الحد الأدنى لاستخدام هذا الكوبون {$min} د.ك"],
            ]);
        }

        $discount = $this->calculateDiscount($coupon, $planPrice);

        return [
            'coupon' => $coupon,
            'discount_amount' => number_format($discount, 3, '.', ''),
        ];
    }

    /**
     * @return array{valid: bool, discount_amount: float|null, message: string}
     */
    public function preview(string $code, Plan $plan): array
    {
        try {
            $result = $this->validateAndApply($code, $plan);

            return [
                'valid' => true,
                'discount_amount' => (float) $result['discount_amount'],
                'message' => 'الكوبون صالح',
            ];
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?? 'الكوبون غير صالح';

            return [
                'valid' => false,
                'discount_amount' => null,
                'message' => $message,
            ];
        }
    }

    private function calculateDiscount(Coupon $coupon, float $planPrice): float
    {
        if ($coupon->type === CouponType::Percentage) {
            $discount = $planPrice * ((float) $coupon->value / 100);
        } else {
            $discount = min((float) $coupon->value, $planPrice);
        }

        return max(0, round($discount, 3));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizePayload(array $data, ?Coupon $existing = null): array
    {
        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim((string) $data['code']));
        }

        $scope = $data['scope'] ?? $existing?->scope?->value;

        if ($scope === 'all') {
            $data['grade_id'] = null;
            $data['plan_id'] = null;
        } elseif ($scope === 'specific_grade') {
            $data['plan_id'] = null;
        } elseif ($scope === 'specific_plan') {
            $data['grade_id'] = null;
        }

        return $data;
    }
}
