<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'phone', 'password', 'is_teaching_staff', 'has_all_branch_access'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_teaching_staff' => 'boolean',
            'has_all_branch_access' => 'boolean',
        ];
    }

    public function taughtClassOfferings(): HasMany
    {
        return $this->hasMany(ClassOffering::class, 'teacher_id');
    }

    public function compensationComponents(): HasMany
    {
        return $this->hasMany(StaffCompensationComponent::class)->orderByDesc('effective_from');
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class, 'teacher_id');
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function staffProfile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function staffAttendanceRecords(): HasMany
    {
        return $this->hasMany(StaffAttendanceRecord::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function createdEnrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'created_by');
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branches')->orderBy('branches.name');
    }
}
