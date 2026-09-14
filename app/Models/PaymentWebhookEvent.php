<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'event_id',
    'processed_at',
])]
class PaymentWebhookEvent extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }
}
