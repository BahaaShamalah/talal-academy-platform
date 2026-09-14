<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function overview(): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->overview(),
        ]);
    }
}
