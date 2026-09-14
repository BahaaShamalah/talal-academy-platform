<?php

namespace App\Models;

use App\Enums\CompensationComponentType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'component_type',
    'amount',
    'is_active',
    'effective_from',
    'effective_to',
])]
class StaffCompensationComponent extends Model
{
    protected function casts(): array
    {
        return [
            'component_type' => CompensationComponentType::class,
            'amount' => 'decimal:3',
            'is_active' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<StaffCompensationComponent>  $query
     * @return Builder<StaffCompensationComponent>
     */
    public function scopeActiveForPeriod(Builder $query, Carbon $periodStart, Carbon $periodEnd): Builder
    {
        return $query
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $periodEnd->toDateString())
            ->where(function (Builder $q) use ($periodStart): void {
                $q->whereNull('effective_to')
                    ->orWhereDate('effective_to', '>=', $periodStart->toDateString());
            });
    }
}
