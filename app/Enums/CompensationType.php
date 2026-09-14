<?php

namespace App\Enums;

enum CompensationType: string
{
    case FixedMonthly = 'fixed_monthly';
    case PerSession = 'per_session';
    case Manual = 'manual';
    case Composite = 'composite';
}
