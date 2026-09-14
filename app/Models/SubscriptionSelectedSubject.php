<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_plan_subscription_id',
    'subject_id',
])]
class SubscriptionSelectedSubject extends Model
{
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(StudentPlanSubscription::class, 'student_plan_subscription_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
