<?php

$frontendUrl = rtrim((string) env('APP_FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:3000')), '/');

return [
    'api_key' => env('MYFATOORAH_API_KEY', ''),
    'test_mode' => filter_var(env('MYFATOORAH_TEST_MODE', true), FILTER_VALIDATE_BOOLEAN),
    'country_iso' => env('MYFATOORAH_COUNTRY_ISO', 'KWT'),
    'webhook_secret' => env('MYFATOORAH_WEBHOOK_SECRET', ''),
    'callback_url' => env('MYFATOORAH_CALLBACK_URL', $frontendUrl.'/account/payment/callback'),
    // Same page as callback — we confirm status via GetPaymentStatus (MyFatoorah sends failures to ErrorUrl).
    'error_url' => env('MYFATOORAH_ERROR_URL', env('MYFATOORAH_CALLBACK_URL', $frontendUrl.'/account/payment/callback')),
];
