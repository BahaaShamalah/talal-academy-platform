<?php

namespace App\Enums;

enum PlanDurationStatus: string
{
    case Upcoming = 'upcoming';
    case Active = 'active';
    case Expired = 'expired';
}
