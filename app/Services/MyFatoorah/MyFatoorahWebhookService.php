<?php

namespace App\Services\MyFatoorah;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;
use App\Models\PaymentWebhookEvent;
use App\Services\InstallmentService;
use App\Services\SubscriptionService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class MyFatoorahWebhookService
{
    public function __construct(
        private readonly MyFatoorahSignatureVerifier $signatureVerifier,
        private readonly SubscriptionService $subscriptionService,
        private readonly InstallmentService $installmentService,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{status: string, message: string}
     */
    public function handle(array $payload, string $signature): array
    {
        $secret = (string) config('myfatoorah.webhook_secret');

        if ($secret === '') {
            if (! config('myfatoorah.test_mode')) {
                abort(401, 'Webhook secret not configured.');
            }

            Log::warning('MyFatoorah webhook: skipping signature verification (test mode, no secret).');
        } elseif (! $this->signatureVerifier->isValid($payload, $signature, $secret)) {
            abort(401, 'Invalid webhook signature.');
        }

        $eventId = (string) data_get($payload, 'Event.Reference', '');
        if ($eventId === '') {
            abort(422, 'Missing event reference.');
        }

        // Idempotency: claim Event.Reference before any side effects.
        if (! $this->claimEvent($eventId)) {
            return [
                'status' => 'ignored',
                'message' => 'Duplicate event.',
            ];
        }

        $eventName = (string) data_get($payload, 'Event.Name', '');
        $eventCode = (int) data_get($payload, 'Event.Code', 0);

        if ($eventCode !== 1 && $eventName !== 'PAYMENT_STATUS_CHANGED') {
            Log::info('MyFatoorah webhook ignored (unsupported event).', [
                'event_id' => $eventId,
                'event_name' => $eventName,
                'event_code' => $eventCode,
            ]);

            return [
                'status' => 'ignored',
                'message' => 'Unsupported event.',
            ];
        }

        $invoiceStatus = strtoupper((string) data_get($payload, 'Data.Invoice.Status', ''));
        $transactionStatus = strtoupper((string) data_get($payload, 'Data.Transaction.Status', ''));

        if ($invoiceStatus !== 'PAID' && $transactionStatus !== 'SUCCESS') {
            Log::info('MyFatoorah payment not successful; invoice left pending.', [
                'event_id' => $eventId,
                'invoice_status' => $invoiceStatus,
                'transaction_status' => $transactionStatus,
            ]);

            return [
                'status' => 'logged',
                'message' => 'Payment not successful.',
            ];
        }

        return $this->fulfillPaidPayment($payload);
    }

    /**
     * Mark invoice/installment paid from a verified successful payment payload.
     *
     * @param  array<string, mixed>  $payload
     * @return array{status: string, message: string}
     */
    public function fulfillPaidPayment(array $payload): array
    {
        $invoice = $this->resolveInvoice($payload);
        if (! $invoice) {
            Log::warning('MyFatoorah payment: invoice not found.', [
                'external_identifier' => data_get($payload, 'Data.Invoice.ExternalIdentifier'),
                'user_defined_field' => data_get($payload, 'Data.Invoice.UserDefinedField'),
            ]);

            abort(404, 'Invoice not found.');
        }

        $installment = $this->resolveInstallment($payload, $invoice);

        $paidAmount = data_get($payload, 'Data.Amount.ValueInDisplayCurrency')
            ?? data_get($payload, 'Data.Amount.ValueInBaseCurrency');

        $expectedAmount = $installment
            ? (string) $installment->amount
            : (string) $invoice->total;

        if (! $this->amountsMatch($expectedAmount, $paidAmount)) {
            Log::warning('MyFatoorah payment amount mismatch.', [
                'invoice_id' => $invoice->id,
                'installment_id' => $installment?->id,
                'expected' => $expectedAmount,
                'paid' => $paidAmount,
            ]);

            abort(422, 'Payment amount does not match expected amount.');
        }

        if ($installment) {
            if ($installment->status->value === 'paid') {
                return [
                    'status' => 'ignored',
                    'message' => 'Installment already paid.',
                ];
            }

            try {
                $this->installmentService->payInstallment($installment, PaymentMethod::Online);
            } catch (\Throwable $e) {
                Log::info('MyFatoorah installment pay skipped.', [
                    'invoice_id' => $invoice->id,
                    'installment_id' => $installment->id,
                    'message' => $e->getMessage(),
                ]);
            }

            return [
                'status' => 'processed',
                'message' => 'Installment marked as paid.',
            ];
        }

        if ($invoice->status === InvoiceStatus::Paid) {
            return [
                'status' => 'ignored',
                'message' => 'Invoice already paid.',
            ];
        }

        try {
            $this->subscriptionService->markInvoicePaid($invoice, PaymentMethod::Online);
        } catch (ValidationException $e) {
            Log::info('MyFatoorah mark paid skipped.', [
                'invoice_id' => $invoice->id,
                'errors' => $e->errors(),
            ]);
        }

        return [
            'status' => 'processed',
            'message' => 'Invoice marked as paid.',
        ];
    }

    /**
     * Atomically claims an event for first-time processing.
     * Returns false if the event was already processed.
     */
    public function claimEvent(string $eventId): bool
    {
        try {
            PaymentWebhookEvent::query()->create([
                'event_id' => $eventId,
                'processed_at' => now(),
            ]);

            return true;
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }

    public function wasProcessed(string $eventId): bool
    {
        return PaymentWebhookEvent::query()->where('event_id', $eventId)->exists();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function resolveInvoice(array $payload): ?Invoice
    {
        $externalId = (string) data_get($payload, 'Data.Invoice.ExternalIdentifier', '');
        $userDefined = (string) data_get($payload, 'Data.Invoice.UserDefinedField', '');

        if ($externalId !== '') {
            $byNumber = Invoice::query()->where('invoice_number', $externalId)->first();
            if ($byNumber) {
                return $byNumber;
            }
        }

        if ($userDefined !== '' && ctype_digit($userDefined)) {
            return Invoice::query()->find((int) $userDefined);
        }

        if ($userDefined !== '' && str_contains($userDefined, ':')) {
            [$invoiceId] = explode(':', $userDefined, 2);
            if (ctype_digit($invoiceId)) {
                return Invoice::query()->find((int) $invoiceId);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function resolveInstallment(array $payload, Invoice $invoice): ?InvoiceInstallment
    {
        $userDefined = (string) data_get($payload, 'Data.Invoice.UserDefinedField', '');

        if ($userDefined !== '' && str_contains($userDefined, ':')) {
            [$invoiceId, $installmentId] = explode(':', $userDefined, 2);
            if (ctype_digit($invoiceId) && ctype_digit($installmentId) && (int) $invoiceId === $invoice->id) {
                return InvoiceInstallment::query()
                    ->where('invoice_id', $invoice->id)
                    ->find((int) $installmentId);
            }
        }

        $externalId = (string) data_get($payload, 'Data.Invoice.ExternalIdentifier', '');
        if (preg_match('/-I(\d+)$/', $externalId, $matches)) {
            return InvoiceInstallment::query()
                ->where('invoice_id', $invoice->id)
                ->find((int) $matches[1]);
        }

        return null;
    }

    public function amountsMatch(string $invoiceTotal, mixed $paidAmount): bool
    {
        if ($paidAmount === null || $paidAmount === '') {
            return false;
        }

        $expected = round((float) $invoiceTotal, 3);
        $actual = round((float) $paidAmount, 3);

        return abs($expected - $actual) < 0.01;
    }
}
