<?php

namespace App\Enums;

enum SupportTicketSenderType: string
{
    case Guardian = 'guardian';
    case Staff = 'staff';
}
