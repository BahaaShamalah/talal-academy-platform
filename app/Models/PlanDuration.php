<?php

namespace App\Models;

use App\Enums\PlanDurationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

#[Fillable([
    'name',
    'start_date',
    'end_date',
])]
class PlanDuration extends Model
{
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    /**
     * @return Attribute<string, never>
     */
    protected function status(): Attribute
    {
        return Attribute::get(function (): string {
            $today = Carbon::today();

            if ($today->lt($this->start_date)) {
                return PlanDurationStatus::Upcoming->value;
            }

            if ($today->gt($this->end_date)) {
                return PlanDurationStatus::Expired->value;
            }

            return PlanDurationStatus::Active->value;
        });
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class, 'duration_period_id');
    }
}
