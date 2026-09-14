<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class FinancialReportController extends Controller
{
    public function __construct(
        private readonly FinancialReportService $financialReportService,
    ) {}

    public function revenue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'group_by' => ['nullable', Rule::in(['day', 'week', 'month'])],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : null;
        $groupBy = $validated['group_by'] ?? 'day';

        return response()->json([
            'data' => $this->financialReportService->revenueSummary($from, $to, $groupBy),
        ]);
    }

    public function revenueByPaymentMethod(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : null;

        return response()->json([
            'data' => $this->financialReportService->revenueByPaymentMethod($from, $to),
        ]);
    }

    public function outstanding(): JsonResponse
    {
        return response()->json([
            'data' => $this->financialReportService->outstandingSummary(),
        ]);
    }
}
