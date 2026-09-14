<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use App\Services\MyFatoorah\MyFatoorahPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class GuardianInvoiceController extends Controller
{
    public function __construct(
        private readonly MyFatoorahPaymentService $paymentService,
        private readonly InvoicePdfService $invoicePdfService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $guardian = $request->user('guardian');
        $studentIds = $guardian->students()->pluck('id');

        $query = Invoice::query()
            ->whereIn('student_id', $studentIds)
            ->with(['student', 'items', 'coupon', 'installments'])
            ->latest();

        if ($request->filled('filter.student_id')) {
            $query->where('student_id', (int) $request->input('filter.student_id'));
        }

        if ($request->filled('filter.status')) {
            $query->where('status', $request->input('filter.status'));
        }

        return InvoiceResource::collection(
            $query->paginate($request->integer('per_page', 50))->appends($request->query())
        );
    }

    public function show(Request $request, Invoice $invoice): InvoiceResource
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);

        return new InvoiceResource($invoice->load(['student', 'items', 'coupon', 'installments']));
    }

    public function pay(Request $request, Invoice $invoice): JsonResponse
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);

        $result = $this->paymentService->initiatePayment($invoice);

        return response()->json([
            'payment_url' => $result['payment_url'],
            'myfatoorah_invoice_id' => $result['myfatoorah_invoice_id'],
        ]);
    }

    public function pdf(Request $request, Invoice $invoice): Response
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);

        $result = $this->invoicePdfService->generate($invoice);
        $disposition = $request->boolean('preview') ? 'inline' : 'attachment';

        return response($result['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$result['filename'].'"',
            'Content-Length' => (string) strlen($result['content']),
        ]);
    }

    public function html(Request $request, Invoice $invoice): Response
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-invoice', $invoice);

        $html = $this->invoicePdfService->renderHtml($invoice, forBrowser: true);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
}
