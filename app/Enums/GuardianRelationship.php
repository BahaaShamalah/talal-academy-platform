<?php

namespace App\Enums;

enum GuardianRelationship: string
{
    case Father = 'أب';
    case Mother = 'أم';
    case Other = 'ولي أمر آخر';
}
