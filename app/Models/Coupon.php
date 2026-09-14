<?php

namespace App\Models;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'code',
    'type',
    'value',
    'scope',
    'grade_id',
    'plan_id',
    'max_uses',
    'used_count',
    'valid_from',
    'valid_until',
    'min_purchase_amount',
    'is_active',
])]
class Coupon extends Model
{
    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'scope' => CouponScope::class,
            'value' => 'decimal:3',
            'min_purchase_amount' => 'decimal:3',
            'valid_from' => 'date',
            'valid_until' => 'date',
            'is_active' => 'boolean',
            'max_uses' => 'integer',
            'used_count' => 'integer',
        ];
    }

    public function setCodeAttribute(string $value): void
    {
        $this->attributes['code'] = strtoupper(trim($value));
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
