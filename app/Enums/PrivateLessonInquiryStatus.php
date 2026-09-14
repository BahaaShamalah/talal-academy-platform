<?php

namespace App\Enums;

enum PrivateLessonInquiryStatus: string
{
    case New = 'new';
    case Accepted = 'accepted';
    case Closed = 'closed';
}
