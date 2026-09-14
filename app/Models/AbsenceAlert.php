<?php

namespace App\Models;

use App\Enums\AbsenceAlertLevel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_id',
    'class_offering_id',
    'consecutive_count',
    'alert_level',
    'triggered_at',
    'acknowledged',
    'acknowledged_by',
    'acknowledged_at',
])]
class AbsenceAlert extends Model
{
    protected function casts(): array
    {
        return [
            'consecutive_count' => 'integer',
            'alert_level' => AbsenceAlertLevel::class,
            'triggered_at' => 'datetime',
            'acknowledged' => 'boolean',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function classOffering(): BelongsTo
    {
        return $this->belongsTo(ClassOffering::class);
    }

    public function acknowledger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
