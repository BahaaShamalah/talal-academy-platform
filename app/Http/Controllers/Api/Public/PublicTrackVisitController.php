<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\TrackVisitRequest;
use App\Services\VisitTrackingService;
use Illuminate\Http\JsonResponse;

class PublicTrackVisitController extends Controller
{
    public function __construct(
        private readonly VisitTrackingService $visitTrackingService,
    ) {}

    public function store(TrackVisitRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->visitTrackingService->record(
            path: $data['path'],
            referrer: $data['referrer'] ?? $request->headers->get('referer'),
            utmParams: [
                'utm_source' => $data['utm_source'] ?? null,
                'utm_medium' => $data['utm_medium'] ?? null,
                'utm_campaign' => $data['utm_campaign'] ?? null,
            ],
            ipAddress: (string) $request->ip(),
            userAgent: (string) $request->userAgent(),
        );

        return response()->json(['ok' => true], 201);
    }
}
