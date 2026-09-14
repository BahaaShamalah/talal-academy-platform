<?php

namespace App\Enums;

enum CouponScope: string
{
    case All = 'all';
    case SpecificGrade = 'specific_grade';
    case SpecificPlan = 'specific_plan';
}
