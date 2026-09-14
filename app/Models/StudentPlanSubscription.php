<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'student_id',
    'plan_id',
    'invoice_id',
    'period_id',
    'status',
    'starts_at',
    'ends_at',
    'cancelled_at',
])]
class StudentPlanSubscription extends Model
{
    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'period_id');
    }

    public function selectedSubjects(): HasMany
    {
        return $this->hasMany(SubscriptionSelectedSubject::class, 'student_plan_subscription_id');
    }

    public function changes(): HasMany
    {
        return $this->hasMany(SubscriptionChange::class, 'student_plan_subscription_id');
    }

    public function freezes(): HasMany
    {
        return $this->hasMany(SubscriptionFreeze::class, 'student_plan_subscription_id');
    }
}
