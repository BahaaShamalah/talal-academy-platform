<?php

namespace App\Enums;

enum CompensationComponentType: string
{
    case BaseSalary = 'base_salary';
    case PerSessionRate = 'per_session_rate';
    case FixedIncentive = 'fixed_incentive';
    case RecurringBonus = 'recurring_bonus';
}
