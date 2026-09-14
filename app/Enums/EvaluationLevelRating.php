<?php

namespace App\Enums;

enum EvaluationLevelRating: string
{
    case Excellent = 'excellent';
    case Good = 'good';
    case NeedsFollowUp = 'needs_follow_up';
}
