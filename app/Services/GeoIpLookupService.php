<?php

namespace App\Services;

use GeoIp2\Database\Reader;
use GeoIp2\Exception\AddressNotFoundException;
use MaxMind\Db\Reader\InvalidDatabaseException;
use Throwable;

class GeoIpLookupService
{
    private ?Reader $reader = null;

    private bool $resolved = false;

    public function countryCode(string $ipAddress): ?string
    {
        if ($ipAddress === '' || $ipAddress === '127.0.0.1' || $ipAddress === '::1') {
            return null;
        }

        $reader = $this->reader();
        if (! $reader) {
            return null;
        }

        try {
            return $reader->country($ipAddress)->country->isoCode;
        } catch (AddressNotFoundException) {
            return null;
        } catch (Throwable) {
            return null;
        }
    }

    private function reader(): ?Reader
    {
        if ($this->resolved) {
            return $this->reader;
        }

        $this->resolved = true;
        $path = (string) config('geoip.database_path');

        if ($path === '' || ! is_file($path)) {
            return $this->reader = null;
        }

        try {
            return $this->reader = new Reader($path);
        } catch (InvalidDatabaseException|Throwable) {
            return $this->reader = null;
        }
    }
}
