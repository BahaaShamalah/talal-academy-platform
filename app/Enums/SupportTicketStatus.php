<?php

namespace App\Enums;

enum SupportTicketStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Replied = 'replied';
    case Closed = 'closed';
}
