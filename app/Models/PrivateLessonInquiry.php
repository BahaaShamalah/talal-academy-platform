<?php

namespace App\Models;

use App\Enums\PrivateLessonInquiryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_name',
    'phone',
    'phone_secondary',
    'grade_id',
    'subject_id',
    'hours',
    'status',
    'admin_notes',
    'reviewed_by',
    'reviewed_at',
])]
class PrivateLessonInquiry extends Model
{
    protected function casts(): array
    {
        return [
            'status' => PrivateLessonInquiryStatus::class,
            'hours' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
