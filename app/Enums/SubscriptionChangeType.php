<?php

namespace App\Enums;

enum SubscriptionChangeType: string
{
    case PlanChange = 'plan_change';
    case AddSubject = 'add_subject';
    case RemoveSubject = 'remove_subject';
}
