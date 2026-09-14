<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'invoice_number',
    'student_id',
    'period_id',
    'coupon_id',
    'status',
    'subtotal',
    'coupon_discount_amount',
    'family_discount_percentage',
    'family_discount_amount',
    'credit_applied_amount',
    'total',
    'payment_method',
    'paid_at',
    'created_by',
    'notes',
])]
class Invoice extends Model
{
    protected function casts(): array
    {
        return [
            'status' => InvoiceStatus::class,
            'payment_method' => PaymentMethod::class,
            'subtotal' => 'decimal:3',
            'coupon_discount_amount' => 'decimal:3',
            'family_discount_percentage' => 'decimal:2',
            'family_discount_amount' => 'decimal:3',
            'credit_applied_amount' => 'decimal:3',
            'total' => 'decimal:3',
            'paid_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'period_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(StudentPlanSubscription::class);
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(InvoiceInstallment::class)->orderBy('sequence');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class, 'related_invoice_id');
    }

    public function hasInstallments(): bool
    {
        if ($this->relationLoaded('installments')) {
            return $this->installments->isNotEmpty();
        }

        return $this->installments()->exists();
    }
}
