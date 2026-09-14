<?php

namespace App\Models;

use App\Enums\StaffAttendanceStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'date',
    'check_in_time',
    'check_out_time',
    'status',
    'late_minutes',
    'overtime_minutes',
    'notes',
    'marked_by',
])]
class StaffAttendanceRecord extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'status' => StaffAttendanceStatus::class,
            'late_minutes' => 'integer',
            'overtime_minutes' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function marker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
