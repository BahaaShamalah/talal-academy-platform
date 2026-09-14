<?php

namespace App\Services\Sms;

use App\Contracts\SmsServiceInterface;
use Illuminate\Support\Facades\Log;

class LogSmsService implements SmsServiceInterface
{
    public function send(string $phone, string $message): void
    {
        Log::channel('sms')->info('SMS', [
            'phone' => $phone,
            'message' => $message,
        ]);
    }
}
