<?php

return [
    /*
    | Preferred output format is detected at runtime (AVIF if GD can encode it, else WebP).
    | Override with MEDIA_OUTPUT_FORMAT=avif|webp only when needed.
    */
    'output_format' => env('MEDIA_OUTPUT_FORMAT'),
    'quality' => (int) env('MEDIA_QUALITY', 80),
    'max_upload_bytes' => (int) env('MEDIA_MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
    'disk' => 'public',
    'directory' => 'media',
    'allowed_mimes' => [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ],
    'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
];
