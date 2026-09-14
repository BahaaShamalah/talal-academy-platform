<?php

namespace App\Models;

use App\Enums\SubscriptionChangeType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_plan_subscription_id',
    'change_type',
    'old_plan_id',
    'new_plan_id',
    'subject_id',
    'calculated_amount_difference',
    'final_amount_difference',
    'supplementary_invoice_id',
    'credit_transaction_id',
    'reason',
    'created_by',
])]
class SubscriptionChange extends Model
{
    protected function casts(): array
    {
        return [
            'change_type' => SubscriptionChangeType::class,
            'calculated_amount_difference' => 'decimal:3',
            'final_amount_difference' => 'decimal:3',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(StudentPlanSubscription::class, 'student_plan_subscription_id');
    }

    public function oldPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'old_plan_id');
    }

    public function newPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'new_plan_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function supplementaryInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'supplementary_invoice_id');
    }

    public function creditTransaction(): BelongsTo
    {
        return $this->belongsTo(CreditTransaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
