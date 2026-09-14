<?php

namespace App\Enums;

enum ContactMessageStatus: string
{
    case New = 'new';
    case Replied = 'replied';
    case Closed = 'closed';
}
