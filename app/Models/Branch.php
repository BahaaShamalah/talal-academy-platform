<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'country',
    'city',
    'address',
    'phone_1',
    'phone_2',
    'is_main',
])]
class Branch extends Model
{
    protected function casts(): array
    {
        return [
            'is_main' => 'boolean',
        ];
    }

    public function halls(): HasMany
    {
        return $this->hasMany(Hall::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_branches');
    }
}
