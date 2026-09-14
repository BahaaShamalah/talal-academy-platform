<?php

namespace App\Models;

use App\Enums\ContractType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'civil_id',
    'date_of_birth',
    'nationality',
    'address',
    'job_title',
    'specialization',
    'contract_start_date',
    'contract_end_date',
    'contract_type',
    'notes',
    'expected_start_time',
    'expected_end_time',
])]
class StaffProfile extends Model
{
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'contract_start_date' => 'date',
            'contract_end_date' => 'date',
            'contract_type' => ContractType::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'staff_subjects')->orderBy('subjects.name');
    }

    public function grades(): BelongsToMany
    {
        return $this->belongsToMany(Grade::class, 'staff_grades')->orderBy('grades.order');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(StaffDocument::class)->orderByDesc('uploaded_at');
    }
}
