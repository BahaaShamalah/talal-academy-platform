<?php

namespace App\Models;

use App\Enums\RefundMethod;
use App\Enums\RefundType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'invoice_id',
    'amount',
    'type',
    'method',
    'reason',
    'processed_by',
])]
class Refund extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:3',
            'type' => RefundType::class,
            'method' => RefundMethod::class,
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Refund $refund): void {
            if ($refund->created_at === null) {
                $refund->created_at = now();
            }
        });
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
