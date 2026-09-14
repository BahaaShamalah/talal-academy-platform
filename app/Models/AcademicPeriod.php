<?php

namespace App\Models;

use App\Enums\AcademicPeriodStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'start_date',
    'end_date',
    'status',
    'registration_opens_at',
    'registration_closes_at',
])]
class AcademicPeriod extends Model
{
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'registration_opens_at' => 'date',
            'registration_closes_at' => 'date',
            'status' => AcademicPeriodStatus::class,
        ];
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class, 'period_id');
    }

    public function classOfferings(): HasMany
    {
        return $this->hasMany(ClassOffering::class, 'period_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(StudentPlanSubscription::class, 'period_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'period_id');
    }
}
