<?php

namespace App\Models;

use App\Enums\PrivateLessonBookingStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'private_lesson_slot_id',
    'private_lesson_offer_id',
    'student_id',
    'invoice_id',
    'status',
    'preferred_period_name',
    'preferred_start_time',
    'preferred_end_time',
])]
class PrivateLessonBooking extends Model
{
    protected function casts(): array
    {
        return [
            'status' => PrivateLessonBookingStatus::class,
        ];
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(PrivateLessonSlot::class, 'private_lesson_slot_id');
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(PrivateLessonOffer::class, 'private_lesson_offer_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
