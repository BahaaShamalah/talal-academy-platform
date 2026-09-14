<?php

namespace App\Models;

use App\Enums\AbsenceAlertLevel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'consecutive_absences_count',
    'alert_level',
    'is_active',
])]
class AbsenceAlertThreshold extends Model
{
    protected function casts(): array
    {
        return [
            'consecutive_absences_count' => 'integer',
            'alert_level' => AbsenceAlertLevel::class,
            'is_active' => 'boolean',
        ];
    }
}
