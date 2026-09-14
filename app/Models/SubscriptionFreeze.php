<?php

namespace App\Models;

use App\Enums\SubscriptionFreezeStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_plan_subscription_id',
    'start_date',
    'end_date',
    'reason',
    'pauses_installments',
    'pauses_attendance_expectation',
    'extends_subscription',
    'previous_status',
    'status',
    'created_by',
])]
class SubscriptionFreeze extends Model
{
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'pauses_installments' => 'boolean',
            'pauses_attendance_expectation' => 'boolean',
            'extends_subscription' => 'boolean',
            'status' => SubscriptionFreezeStatus::class,
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(StudentPlanSubscription::class, 'student_plan_subscription_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
