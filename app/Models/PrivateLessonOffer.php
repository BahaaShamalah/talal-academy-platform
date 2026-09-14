<?php

namespace App\Models;

use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'grade_id',
    'subject_id',
    'teacher_id',
    'duration_minutes',
    'session_type',
    'price',
    'max_students',
    'status',
    'image_media_id',
])]
class PrivateLessonOffer extends Model
{
    protected function casts(): array
    {
        return [
            'session_type' => PrivateLessonSessionType::class,
            'status' => PrivateLessonOfferStatus::class,
            'price' => 'decimal:2',
            'duration_minutes' => 'integer',
            'max_students' => 'integer',
        ];
    }

    public function imageMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'image_media_id');
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(PrivateLessonSlot::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(PrivateLessonBooking::class);
    }

    public function invoiceItems(): MorphMany
    {
        return $this->morphMany(InvoiceItem::class, 'itemable');
    }

    public function isIndividual(): bool
    {
        return $this->session_type === PrivateLessonSessionType::Individual;
    }
}
