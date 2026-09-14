<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CreditTransactionResource;
use App\Models\Guardian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianCreditController extends Controller
{
    public function show(Guardian $guardian): JsonResponse
    {
        $guardian->load(['creditTransactions' => fn ($q) => $q->orderByDesc('created_at')->limit(100)]);

        return response()->json([
            'balance' => $guardian->credit_balance,
            'transactions' => CreditTransactionResource::collection($guardian->creditTransactions),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $guardian = $request->user('guardian');
        $guardian->load(['creditTransactions' => fn ($q) => $q->orderByDesc('created_at')->limit(100)]);

        return response()->json([
            'balance' => $guardian->credit_balance,
            'transactions' => CreditTransactionResource::collection($guardian->creditTransactions),
        ]);
    }
}
