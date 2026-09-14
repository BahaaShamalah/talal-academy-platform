<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case PendingPayment = 'pending_payment';
    case Active = 'active';
    case Suspended = 'suspended';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
