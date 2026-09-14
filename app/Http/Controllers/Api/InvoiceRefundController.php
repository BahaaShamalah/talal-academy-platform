<?php

namespace App\Http\Controllers\Api;

use App\Enums\RefundMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\ProcessRefundRequest;
use App\Http\Resources\RefundResource;
use App\Models\Invoice;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InvoiceRefundController extends Controller
{
    public function __construct(
        private readonly RefundService $refundService,
    ) {}

    public function index(Invoice $invoice): AnonymousResourceCollection
    {
        return RefundResource::collection($this->refundService->listForInvoice($invoice));
    }

    public function store(ProcessRefundRequest $request, Invoice $invoice): JsonResponse
    {
        $refund = $this->refundService->processRefund(
            $invoice,
            (float) $request->validated('amount'),
            RefundMethod::from($request->validated('method')),
            $request->validated('reason'),
            $request->user(),
        );

        return (new RefundResource($refund))
            ->response()
            ->setStatusCode(201);
    }
}
