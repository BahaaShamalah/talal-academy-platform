<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\MyFatoorah\MyFatoorahPaymentService;
use App\Services\MyFatoorah\MyFatoorahWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyFatoorahController extends Controller
{
    public function __construct(
        private readonly MyFatoorahPaymentService $paymentService,
        private readonly MyFatoorahWebhookService $webhookService,
    ) {}

    public function pay(Invoice $invoice): JsonResponse
    {
        $result = $this->paymentService->initiatePayment($invoice);

        return response()->json([
            'payment_url' => $result['payment_url'],
            'myfatoorah_invoice_id' => $result['myfatoorah_invoice_id'],
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $signature = (string) $request->header('MyFatoorah-Signature', '');

        /** @var array<string, mixed> $payload */
        $payload = $request->all();

        $result = $this->webhookService->handle($payload, $signature);

        return response()->json($result);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_id' => ['required', 'string', 'max:64'],
        ]);

        $result = $this->paymentService->confirmPayment($validated['payment_id']);

        return response()->json($result);
    }
}
