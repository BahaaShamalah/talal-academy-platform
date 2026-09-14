<?php

namespace Database\Seeders;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        Coupon::query()->create([
            'code' => 'WELCOME10',
            'type' => CouponType::Percentage,
            'value' => 10,
            'scope' => CouponScope::All,
            'max_uses' => null,
            'used_count' => 0,
            'valid_from' => null,
            'valid_until' => null,
            'min_purchase_amount' => null,
            'is_active' => true,
        ]);

        Coupon::query()->create([
            'code' => 'RAMADAN5',
            'type' => CouponType::Fixed,
            'value' => 5,
            'scope' => CouponScope::All,
            'max_uses' => null,
            'used_count' => 0,
            'valid_from' => null,
            'valid_until' => now()->addDays(30)->toDateString(),
            'min_purchase_amount' => null,
            'is_active' => true,
        ]);
    }
}
