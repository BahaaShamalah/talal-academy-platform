<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Services\AccountStatementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuardianStatementController extends Controller
{
    public function __construct(
        private readonly AccountStatementService $accountStatementService,
    ) {}

    public function me(Request $request): JsonResponse
    {
        return $this->statementResponse(
            $request->user('guardian'),
            $request->input('from'),
            $request->input('to'),
        );
    }

    public function show(Request $request, Guardian $guardian): JsonResponse
    {
        return $this->statementResponse(
            $guardian,
            $request->input('from'),
            $request->input('to'),
        );
    }

    private function statementResponse(Guardian $guardian, mixed $from, mixed $to): JsonResponse
    {
        $fromDate = $from ? Carbon::parse($from)->startOfDay() : null;
        $toDate = $to ? Carbon::parse($to)->endOfDay() : null;

        return response()->json(
            $this->accountStatementService->generateForGuardian($guardian, $fromDate, $toDate),
        );
    }
}
