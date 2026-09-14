<?php

namespace App\Enums;

enum PlanDurationType: string
{
    case MonthlyRecurring = 'monthly_recurring';
    case FixedPeriod = 'fixed_period';
}
