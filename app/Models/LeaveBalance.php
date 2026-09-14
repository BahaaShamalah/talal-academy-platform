<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'leave_type_id',
    'year',
    'total_days',
    'used_days',
])]
class LeaveBalance extends Model
{
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'total_days' => 'integer',
            'used_days' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function remainingDays(): int
    {
        return max(0, $this->total_days - $this->used_days);
    }
}
