<?php

namespace App\Enums;

enum AcademicPeriodStatus: string
{
    case Draft = 'draft';
    case RegistrationOpen = 'registration_open';
    case Active = 'active';
    case Closed = 'closed';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'مسودة',
            self::RegistrationOpen => 'فتح التسجيل',
            self::Active => 'نشط',
            self::Closed => 'مغلق',
            self::Archived => 'مؤرشف',
        };
    }
}
