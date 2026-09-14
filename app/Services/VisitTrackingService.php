<?php

namespace App\Services;

use App\Enums\DeviceType;
use App\Models\PageVisit;
use Illuminate\Support\Carbon;

class VisitTrackingService
{
    /** @var list<string> */
    private const BOT_PATTERNS = [
        'bot',
        'crawl',
        'spider',
        'slurp',
        'googlebot',
        'bingbot',
        'yandex',
        'baidu',
        'duckduck',
        'facebookexternalhit',
        'facebot',
        'twitterbot',
        'linkedinbot',
        'embedly',
        'quora',
        'pinterest',
        'redditbot',
        'applebot',
        'semrush',
        'ahrefs',
        'mj12bot',
        'dotbot',
        'petalbot',
        'bytespider',
        'gptbot',
        'claudebot',
        'curl/',
        'wget/',
        'python-requests',
        'httpclient',
        'scrapy',
        'headless',
        'phantomjs',
        'selenium',
    ];

    public function __construct(
        private readonly GeoIpLookupService $geoIpLookup,
    ) {}

    /**
     * @param  array{utm_source?: ?string, utm_medium?: ?string, utm_campaign?: ?string}  $utmParams
     */
    public function record(
        string $path,
        ?string $referrer,
        array $utmParams,
        string $ipAddress,
        string $userAgent,
    ): PageVisit {
        $countryCode = $this->geoIpLookup->countryCode($ipAddress);

        return PageVisit::query()->create([
            'path' => $this->normalizePath($path),
            'referrer' => $this->nullableTrim($referrer, 1000),
            'utm_source' => $this->nullableTrim($utmParams['utm_source'] ?? null, 100),
            'utm_medium' => $this->nullableTrim($utmParams['utm_medium'] ?? null, 100),
            'utm_campaign' => $this->nullableTrim($utmParams['utm_campaign'] ?? null, 150),
            'ip_hash' => $this->anonymizeIp($ipAddress),
            'country_code' => $countryCode ? strtoupper($countryCode) : null,
            'device_type' => $this->detectDeviceType($userAgent),
            'is_bot' => $this->isBot($userAgent),
            'visited_at' => Carbon::now(),
        ]);
    }

    public function anonymizeIp(string $ipAddress): string
    {
        $ip = trim($ipAddress);

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);
            $parts[3] = '0';

            return implode('.', $parts);
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $expanded = inet_pton($ip);
            if ($expanded === false) {
                return hash('sha256', $ip);
            }

            // Zero the last 80 bits (keep /48 network prefix for coarse uniqueness).
            $bytes = unpack('C*', $expanded);
            for ($i = 7; $i <= 16; $i++) {
                $bytes[$i] = 0;
            }

            return inet_ntop(pack('C*', ...$bytes)) ?: hash('sha256', $ip);
        }

        return hash('sha256', $ip !== '' ? $ip : 'unknown');
    }

    public function detectDeviceType(string $userAgent): DeviceType
    {
        $ua = strtolower($userAgent);

        if ($ua === '') {
            return DeviceType::Desktop;
        }

        if (preg_match('/ipad|tablet|kindle|silk|playbook|nexus 7|nexus 9|nexus 10|sm-t|gt-p|tab(?!let pc)/i', $userAgent)) {
            return DeviceType::Tablet;
        }

        if (preg_match('/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i', $userAgent)) {
            return DeviceType::Mobile;
        }

        if (str_contains($ua, 'android') && ! str_contains($ua, 'mobile')) {
            return DeviceType::Tablet;
        }

        return DeviceType::Desktop;
    }

    public function isBot(string $userAgent): bool
    {
        $ua = strtolower($userAgent);
        if ($ua === '') {
            return true;
        }

        foreach (self::BOT_PATTERNS as $pattern) {
            if (str_contains($ua, $pattern)) {
                return true;
            }
        }

        return false;
    }

    private function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '/';
        }

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        $path = parse_url($path, PHP_URL_PATH) ?: $path;

        return mb_substr($path, 0, 500);
    }

    private function nullableTrim(?string $value, int $max): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return mb_substr($value, 0, $max);
    }
}
