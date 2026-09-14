<?php

namespace App\Models;

use App\Enums\InstallmentStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable([
    'invoice_id',
    'sequence',
    'amount',
    'due_date',
    'status',
    'paid_at',
    'payment_method',
])]
class InvoiceInstallment extends Model
{
    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'amount' => 'decimal:3',
            'due_date' => 'date',
            'status' => InstallmentStatus::class,
            'payment_method' => PaymentMethod::class,
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return Attribute<bool, never>
     */
    protected function isOverdue(): Attribute
    {
        return Attribute::get(function (): bool {
            if ($this->status !== InstallmentStatus::Pending) {
                return false;
            }

            return Carbon::today()->gt($this->due_date);
        });
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
