<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\MarkInvoicePaidRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use App\Services\InvoiceService;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly SubscriptionService $subscriptionService,
        private readonly InvoicePdfService $invoicePdfService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return InvoiceResource::collection($this->invoiceService->list($request));
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($invoice->load(['student', 'items', 'coupon', 'installments']));
    }

    public function markPaid(MarkInvoicePaidRequest $request, Invoice $invoice): InvoiceResource
    {
        $paymentMethod = PaymentMethod::from($request->validated('payment_method'));

        return new InvoiceResource(
            $this->subscriptionService
                ->markInvoicePaid($invoice, $paymentMethod)
                ->load(['student', 'items', 'coupon', 'installments'])
        );
    }

    public function pdf(Request $request, Invoice $invoice): Response
    {
        $result = $this->invoicePdfService->generate($invoice);
        $disposition = $request->boolean('preview') ? 'inline' : 'attachment';

        return response($result['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$result['filename'].'"',
            'Content-Length' => (string) strlen($result['content']),
        ]);
    }
}
