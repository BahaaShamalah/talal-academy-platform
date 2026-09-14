<?php

return [
    /*
    | Local MaxMind GeoLite2 Country database (no per-request API).
    | Download requires a free MaxMind account + license key (one-time setup).
    | Place the file at storage/app/geoip/GeoLite2-Country.mmdb
    | If missing, country_code stays null — tracking still works.
    */
    'database_path' => env('GEOIP_DATABASE_PATH', storage_path('app/geoip/GeoLite2-Country.mmdb')),
];
