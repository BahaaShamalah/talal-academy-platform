<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case PendingPayment = 'pending_payment';
    case Active = 'active';
    case Frozen = 'frozen';
    case Expired = 'expired';
    case Cancelled = 'cancelled';
}
