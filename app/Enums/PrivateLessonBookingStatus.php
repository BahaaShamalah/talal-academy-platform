<?php

namespace App\Enums;

enum PrivateLessonBookingStatus: string
{
    case PendingCoordination = 'pending_coordination';
    case PendingPayment = 'pending_payment';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
