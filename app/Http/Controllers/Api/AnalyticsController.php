<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\AnalyticsRangeRequest;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analyticsService,
    ) {}

    public function overview(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);

        return response()->json($this->analyticsService->overview($from, $to, $includeBots));
    }

    public function timeseries(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);
        $groupBy = $request->validated('group_by', 'day') ?: 'day';

        return response()->json([
            'data' => $this->analyticsService->timeseries($from, $to, $groupBy, $includeBots),
        ]);
    }

    public function topPages(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);
        $limit = (int) ($request->validated('limit') ?: 10);

        return response()->json([
            'data' => $this->analyticsService->topPages($from, $to, $limit, $includeBots),
        ]);
    }

    public function topReferrers(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);
        $limit = (int) ($request->validated('limit') ?: 10);

        return response()->json([
            'data' => $this->analyticsService->topReferrers($from, $to, $limit, $includeBots),
        ]);
    }

    public function byCountry(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);

        return response()->json([
            'data' => $this->analyticsService->byCountry($from, $to, $includeBots),
        ]);
    }

    public function byDevice(AnalyticsRangeRequest $request): JsonResponse
    {
        [$from, $to, $includeBots] = $this->range($request);

        return response()->json([
            'data' => $this->analyticsService->byDevice($from, $to, $includeBots),
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: bool}
     */
    private function range(AnalyticsRangeRequest $request): array
    {
        $to = $request->validated('to')
            ? Carbon::parse($request->validated('to'))
            : Carbon::today();
        $from = $request->validated('from')
            ? Carbon::parse($request->validated('from'))
            : $to->copy()->subDays(29);

        $includeBots = (bool) $request->boolean('include_bots');

        return [$from, $to, $includeBots];
    }
}
