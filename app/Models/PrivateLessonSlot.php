<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'private_lesson_offer_id',
    'day_of_week',
    'specific_date',
    'start_time',
    'end_time',
    'capacity',
])]
class PrivateLessonSlot extends Model
{
    protected function casts(): array
    {
        return [
            'specific_date' => 'date',
            'capacity' => 'integer',
            'day_of_week' => 'integer',
        ];
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(PrivateLessonOffer::class, 'private_lesson_offer_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(PrivateLessonBooking::class);
    }
}
