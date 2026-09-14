<?php

namespace App\Support;

class TimeFormatter
{
    public static function to12Hour(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        $normalized = substr((string) $time, 0, 5);

        if (! preg_match('/^(\d{1,2}):(\d{2})$/', $normalized, $matches)) {
            return $normalized;
        }

        $hour = (int) $matches[1];
        $minute = $matches[2];
        $period = $hour >= 12 ? 'م' : 'ص';
        $hour12 = $hour % 12;

        if ($hour12 === 0) {
            $hour12 = 12;
        }

        return $hour12.':'.$minute.' '.$period;
    }

    public static function range(mixed $start, mixed $end): string
    {
        return self::to12Hour($start).' – '.self::to12Hour($end);
    }
}
