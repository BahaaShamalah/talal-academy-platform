<?php

namespace App\Support;

final class KuwaitPhone
{
    public static function normalize(mixed $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?: '';
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00965')) {
            $digits = substr($digits, 5);
        } elseif (str_starts_with($digits, '965')) {
            $digits = substr($digits, 3);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        $digits = substr($digits, 0, 8);

        return $digits === '' ? null : $digits;
    }

    public static function whatsapp(string $local): string
    {
        return '965'.$local;
    }
}
