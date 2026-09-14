<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\MarkInstallmentPaidRequest;
use App\Http\Resources\InvoiceInstallmentResource;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;
use App\Services\InstallmentService;
use App\Services\MyFatoorah\MyFatoorahPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class InvoiceInstallmentController extends Controller
{
    public function __construct(
        private readonly InstallmentService $installmentService,
        private readonly MyFatoorahPaymentService $paymentService,
    ) {}

    public function index(Request $request, Invoice $invoice): AnonymousResourceCollection
    {
        if ($request->user('guardian')) {
            Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);
        }

        return InvoiceInstallmentResource::collection(
            $this->installmentService->listForInvoice($invoice)
        );
    }

    public function overdueIndex(Request $request): AnonymousResourceCollection
    {
        return InvoiceInstallmentResource::collection(
            $this->installmentService->listOverdue($request)
        );
    }

    public function pay(Request $request, Invoice $invoice, InvoiceInstallment $installment): JsonResponse
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);
        $this->installmentService->assertBelongsToInvoice($installment, $invoice);

        $result = $this->paymentService->initiateInstallmentPayment($invoice, $installment);

        return response()->json([
            'payment_url' => $result['payment_url'],
            'myfatoorah_invoice_id' => $result['myfatoorah_invoice_id'],
        ]);
    }

    public function markPaid(
        MarkInstallmentPaidRequest $request,
        Invoice $invoice,
        InvoiceInstallment $installment,
    ): InvoiceInstallmentResource {
        $this->installmentService->assertBelongsToInvoice($installment, $invoice);

        $paymentMethod = PaymentMethod::from($request->validated('payment_method'));

        return new InvoiceInstallmentResource(
            $this->installmentService->payInstallment($installment, $paymentMethod)
        );
    }
}
