<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'number_of_installments',
    'split_percentages',
    'due_offset_days',
])]
class InstallmentTemplate extends Model
{
    protected function casts(): array
    {
        return [
            'number_of_installments' => 'integer',
            'split_percentages' => 'array',
            'due_offset_days' => 'array',
        ];
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class);
    }
}
