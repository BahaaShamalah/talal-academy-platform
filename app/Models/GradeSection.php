<?php

namespace App\Models;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'grade_id',
    'period_id',
    'name',
    'gender',
    'capacity',
    'status',
])]
class GradeSection extends Model
{
    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'status' => ClassOfferingStatus::class,
        ];
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'period_id');
    }

    public function classOfferings(): HasMany
    {
        return $this->hasMany(ClassOffering::class);
    }
}
