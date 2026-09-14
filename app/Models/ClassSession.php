<?php

namespace App\Models;

use App\Enums\ClassSessionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'class_offering_id',
    'class_schedule_id',
    'teacher_id',
    'hall_id',
    'session_date',
    'start_time',
    'end_time',
    'status',
    'modified_from_schedule',
    'is_makeup',
    'needs_substitute',
    'cancellation_reason',
])]
class ClassSession extends Model
{
    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'status' => ClassSessionStatus::class,
            'modified_from_schedule' => 'boolean',
            'is_makeup' => 'boolean',
            'needs_substitute' => 'boolean',
        ];
    }

    public function classOffering(): BelongsTo
    {
        return $this->belongsTo(ClassOffering::class);
    }

    public function classSchedule(): BelongsTo
    {
        return $this->belongsTo(ClassSchedule::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function hall(): BelongsTo
    {
        return $this->belongsTo(Hall::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function effectiveTeacherId(): int
    {
        return (int) ($this->teacher_id ?? $this->classOffering?->teacher_id);
    }

    public function effectiveHallId(): int
    {
        return (int) ($this->hall_id ?? $this->classOffering?->hall_id);
    }
}
