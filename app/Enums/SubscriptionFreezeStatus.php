<?php

namespace App\Enums;

enum SubscriptionFreezeStatus: string
{
    case Active = 'active';
    case Ended = 'ended';
}
