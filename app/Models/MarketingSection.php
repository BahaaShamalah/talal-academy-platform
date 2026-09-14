<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'section_key',
    'content',
    'is_active',
    'display_order',
])]
class MarketingSection extends Model
{
    protected function casts(): array
    {
        return [
            'content' => 'array',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }
}
