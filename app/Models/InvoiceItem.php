<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'invoice_id',
    'itemable_type',
    'itemable_id',
    'description',
    'unit_price',
    'quantity',
    'line_total',
])]
class InvoiceItem extends Model
{
    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:3',
            'line_total' => 'decimal:3',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function itemable(): MorphTo
    {
        return $this->morphTo();
    }
}
