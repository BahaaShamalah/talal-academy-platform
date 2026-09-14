<?php

namespace App\Services;

use App\Models\PageVisit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * @return array{
     *     total_visits: int,
     *     unique_visitors: int,
     *     avg_daily_visits: float,
     *     from: string,
     *     to: string
     * }
     */
    public function overview(Carbon $from, Carbon $to, bool $includeBots = false): array
    {
        $query = $this->baseQuery($from, $to, $includeBots);

        $totalVisits = (clone $query)->count();
        $uniqueVisitors = (clone $query)->distinct()->count('ip_hash');
        $days = max(1, $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1);

        return [
            'total_visits' => $totalVisits,
            'unique_visitors' => $uniqueVisitors,
            'avg_daily_visits' => round($totalVisits / $days, 2),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }

    /**
     * @return list<array{period: string, visits: int, unique_visitors: int}>
     */
    public function timeseries(Carbon $from, Carbon $to, string $groupBy = 'day', bool $includeBots = false): array
    {
        $driver = DB::connection()->getDriverName();
        $periodExpr = match ($groupBy) {
            'week' => $driver === 'pgsql'
                ? "to_char(date_trunc('week', visited_at), 'IYYY-\"W\"IW')"
                : "DATE_FORMAT(visited_at, '%x-W%v')",
            default => $driver === 'pgsql'
                ? 'to_char(visited_at, \'YYYY-MM-DD\')'
                : 'DATE(visited_at)',
        };

        $rows = $this->baseQuery($from, $to, $includeBots)
            ->selectRaw("{$periodExpr} as period")
            ->selectRaw('COUNT(*) as visits')
            ->selectRaw('COUNT(DISTINCT ip_hash) as unique_visitors')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return $rows->map(fn ($row) => [
            'period' => (string) $row->period,
            'visits' => (int) $row->visits,
            'unique_visitors' => (int) $row->unique_visitors,
        ])->all();
    }

    /**
     * @return list<array{path: string, visits: int}>
     */
    public function topPages(Carbon $from, Carbon $to, int $limit = 10, bool $includeBots = false): array
    {
        return $this->baseQuery($from, $to, $includeBots)
            ->select('path')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('path')
            ->orderByDesc('visits')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'path' => (string) $row->path,
                'visits' => (int) $row->visits,
            ])
            ->all();
    }

    /**
     * @return list<array{referrer: string, visits: int}>
     */
    public function topReferrers(Carbon $from, Carbon $to, int $limit = 10, bool $includeBots = false): array
    {
        $rows = $this->baseQuery($from, $to, $includeBots)
            ->whereNotNull('referrer')
            ->where('referrer', '!=', '')
            ->select('referrer')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('referrer')
            ->orderByDesc('visits')
            ->limit(200)
            ->get();

        /** @var Collection<string, int> $grouped */
        $grouped = collect();
        foreach ($rows as $row) {
            $host = $this->shortReferrer((string) $row->referrer);
            if ($host === null) {
                continue;
            }
            $grouped[$host] = ($grouped[$host] ?? 0) + (int) $row->visits;
        }

        return $grouped
            ->sortDesc()
            ->take($limit)
            ->map(fn (int $visits, string $referrer) => [
                'referrer' => $referrer,
                'visits' => $visits,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{country_code: string|null, visits: int}>
     */
    public function byCountry(Carbon $from, Carbon $to, bool $includeBots = false): array
    {
        return $this->baseQuery($from, $to, $includeBots)
            ->select('country_code')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('country_code')
            ->orderByDesc('visits')
            ->get()
            ->map(fn ($row) => [
                'country_code' => $row->country_code,
                'visits' => (int) $row->visits,
            ])
            ->all();
    }

    /**
     * @return list<array{device_type: string, visits: int}>
     */
    public function byDevice(Carbon $from, Carbon $to, bool $includeBots = false): array
    {
        return $this->baseQuery($from, $to, $includeBots)
            ->select('device_type')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('device_type')
            ->orderByDesc('visits')
            ->get()
            ->map(fn ($row) => [
                'device_type' => (string) ($row->device_type instanceof \BackedEnum ? $row->device_type->value : $row->device_type),
                'visits' => (int) $row->visits,
            ])
            ->all();
    }

    public function shortReferrer(string $referrer): ?string
    {
        $referrer = trim($referrer);
        if ($referrer === '') {
            return null;
        }

        $host = parse_url($referrer, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            // bare host or relative
            $host = preg_replace('#^https?://#i', '', $referrer) ?? $referrer;
            $host = explode('/', $host)[0] ?? '';
        }

        $host = strtolower(preg_replace('/^www\./', '', $host) ?? $host);

        return $host !== '' ? $host : null;
    }

    private function baseQuery(Carbon $from, Carbon $to, bool $includeBots)
    {
        $query = PageVisit::query()
            ->where('visited_at', '>=', $from->copy()->startOfDay())
            ->where('visited_at', '<=', $to->copy()->endOfDay());

        if (! $includeBots) {
            $query->where('is_bot', false);
        }

        return $query;
    }
}
