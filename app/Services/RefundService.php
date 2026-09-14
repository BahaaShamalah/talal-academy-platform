<?php

namespace App\Services;

use App\Enums\CreditTransactionType;
use App\Enums\InvoiceStatus;
use App\Enums\RefundMethod;
use App\Enums\RefundType;
use App\Models\CreditTransaction;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RefundService
{
    public function __construct(
        private readonly CreditService $creditService,
    ) {}

    public function processRefund(
        Invoice $invoice,
        float $amount,
        RefundMethod $method,
        string $reason,
        User $processedBy,
    ): Refund {
        $amount = round($amount, 3);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['مبلغ الاسترداد يجب أن يكون أكبر من صفر.'],
            ])->status(422);
        }

        $refund = DB::transaction(function () use ($invoice, $amount, $method, $reason, $processedBy) {
            $invoice = Invoice::query()->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            $invoice->loadMissing(['student.guardian', 'installments']);

            $refundable = $this->creditService->refundableAmountOnInvoice($invoice);

            if ($amount > $refundable + 0.0001) {
                throw ValidationException::withMessages([
                    'amount' => [
                        sprintf(
                            'المبلغ المطلوب استرداده أكبر من المدفوع فعليًا (%s د.ك)',
                            number_format($refundable, 3, '.', ''),
                        ),
                    ],
                ])->status(422);
            }

            $totalRefundedAfter = $this->creditService->refundedAmountOnInvoice($invoice) + $amount;
            $paidAmount = $this->creditService->paidAmountOnInvoice($invoice);
            $type = abs($totalRefundedAfter - $paidAmount) < 0.001
                ? RefundType::Full
                : RefundType::Partial;

            $refund = Refund::query()->create([
                'invoice_id' => $invoice->id,
                'amount' => number_format($amount, 3, '.', ''),
                'type' => $type,
                'method' => $method,
                'reason' => $reason,
                'processed_by' => $processedBy->id,
            ]);

            if ($method === RefundMethod::Credit) {
                $guardian = $invoice->student?->guardian;
                if (! $guardian) {
                    throw ValidationException::withMessages([
                        'method' => ['لا يمكن تحويل الاسترداد لرصيد بدون ولي أمر مرتبط بالطالب.'],
                    ])->status(422);
                }

                CreditTransaction::query()->create([
                    'guardian_id' => $guardian->id,
                    'amount' => number_format($amount, 3, '.', ''),
                    'type' => CreditTransactionType::RefundCredit,
                    'related_invoice_id' => $invoice->id,
                    'notes' => $reason,
                    'created_by' => $processedBy->id,
                ]);
            }

            if ($type === RefundType::Full) {
                $invoice->update(['status' => InvoiceStatus::Refunded]);
            }

            return $refund->load(['processor', 'invoice']);
        });

        AuditLogService::log(
            'invoice.refund',
            $invoice,
            sprintf(
                'استرداد %s د.ك بطريقة %s للفاتورة %s، السبب: %s',
                number_format($amount, 3, '.', ''),
                $method->value,
                $invoice->invoice_number,
                $reason,
            ),
            null,
            [
                'amount' => $amount,
                'method' => $method->value,
                'reason' => $reason,
                'refund_id' => $refund->id,
            ],
            $processedBy,
        );

        return $refund;
    }

    /**
     * @return Collection<int, Refund>
     */
    public function listForInvoice(Invoice $invoice): Collection
    {
        return Refund::query()
            ->where('invoice_id', $invoice->id)
            ->with('processor')
            ->orderByDesc('created_at')
            ->get();
    }
}
