<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'min_children_count',
    'discount_percentage',
    'is_active',
])]
class FamilyDiscountRule extends Model
{
    protected function casts(): array
    {
        return [
            'min_children_count' => 'integer',
            'discount_percentage' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
