<?php

namespace App\Models;

use App\Enums\NotificationChannel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'notifiable_type',
    'notifiable_id',
    'event_key',
    'channel',
    'subject',
    'body',
    'meta',
    'is_read',
    'read_at',
    'created_at',
])]
class AppNotification extends Model
{
    public $timestamps = false;

    protected $table = 'notifications';

    protected function casts(): array
    {
        return [
            'channel' => NotificationChannel::class,
            'meta' => 'array',
            'is_read' => 'boolean',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }
}
