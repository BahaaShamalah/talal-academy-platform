<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\StudentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'file_number',
    'civil_id',
    'full_name',
    'gender',
    'nationality',
    'date_of_birth',
    'phone',
    'phone_secondary',
    'address',
    'previous_school',
    'current_grade_id',
    'guardian_id',
    'photo_path',
    'status',
    'notes',
])]
class Student extends Model
{
    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'date_of_birth' => 'date',
            'status' => StudentStatus::class,
        ];
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function currentGrade(): BelongsTo
    {
        return $this->belongsTo(Grade::class, 'current_grade_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function planSubscriptions(): HasMany
    {
        return $this->hasMany(StudentPlanSubscription::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}
