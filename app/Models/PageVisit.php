<?php

namespace App\Models;

use App\Enums\DeviceType;
use Illuminate\Database\Eloquent\Model;

class PageVisit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'path',
        'referrer',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'ip_hash',
        'country_code',
        'device_type',
        'is_bot',
        'visited_at',
    ];

    protected function casts(): array
    {
        return [
            'device_type' => DeviceType::class,
            'is_bot' => 'boolean',
            'visited_at' => 'datetime',
        ];
    }
}
