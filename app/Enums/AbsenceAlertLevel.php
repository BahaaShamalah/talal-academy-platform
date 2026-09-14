<?php

namespace App\Enums;

enum AbsenceAlertLevel: string
{
    case Notice = 'notice';
    case FollowUp = 'follow_up';
}
