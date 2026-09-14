<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'institute_name_ar',
    'institute_name_en',
    'logo_media_id',
    'stamp_media_id',
    'address',
    'phone',
    'email',
    'commercial_registration_number',
    'invoice_footer_note',
    'director_name',
    'private_lesson_periods',
])]
class InstituteSetting extends Model
{
    public static function current(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            [
                'institute_name_ar' => 'معهد طلال أكاديمي',
                'private_lesson_periods' => self::defaultPrivateLessonPeriods(),
            ],
        );
    }

    /**
     * @return list<array{id: string, name_ar: string, start_time: string, end_time: string, is_active: bool}>
     */
    public static function defaultPrivateLessonPeriods(): array
    {
        return [
            [
                'id' => 'morning',
                'name_ar' => 'الفترة الصباحية',
                'start_time' => '08:00',
                'end_time' => '12:00',
                'is_active' => true,
            ],
            [
                'id' => 'evening',
                'name_ar' => 'الفترة المسائية',
                'start_time' => '16:00',
                'end_time' => '20:00',
                'is_active' => true,
            ],
        ];
    }

    /**
     * @return list<array{id: string, name_ar: string, start_time: string, end_time: string, is_active: bool}>
     */
    public function activePrivateLessonPeriods(): array
    {
        $periods = $this->private_lesson_periods;
        if (! is_array($periods) || $periods === []) {
            $periods = self::defaultPrivateLessonPeriods();
        }

        return array_values(array_filter(
            $periods,
            static fn ($p) => is_array($p) && ($p['is_active'] ?? true) !== false,
        ));
    }

    protected function casts(): array
    {
        return [
            'private_lesson_periods' => 'array',
        ];
    }

    public function logoMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'logo_media_id');
    }

    public function stampMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'stamp_media_id');
    }

    public function logoAbsolutePath(): ?string
    {
        return $this->logoMedia?->absolutePath();
    }

    public function stampAbsolutePath(): ?string
    {
        return $this->stampMedia?->absolutePath();
    }
}
