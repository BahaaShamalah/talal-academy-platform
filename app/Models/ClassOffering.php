<?php

namespace App\Models;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'grade_id',
    'grade_section_id',
    'subject_id',
    'teacher_id',
    'hall_id',
    'period_id',
    'gender',
    'status',
])]
class ClassOffering extends Model
{
    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'status' => ClassOfferingStatus::class,
        ];
    }

    /**
     * Offerings with no gender set accept any student; otherwise must match exactly.
     *
     * @param  Builder<ClassOffering>  $query
     */
    public function scopeMatchingStudentGender(Builder $query, Gender $gender): Builder
    {
        return $query->where(function (Builder $q) use ($gender) {
            $q->whereNull('gender')->orWhere('gender', $gender->value);
        });
    }

    public function matchesStudentGender(Gender $gender): bool
    {
        return $this->gender === null || $this->gender === $gender;
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function gradeSection(): BelongsTo
    {
        return $this->belongsTo(GradeSection::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function hall(): BelongsTo
    {
        return $this->belongsTo(Hall::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'period_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ClassSession::class);
    }
}
