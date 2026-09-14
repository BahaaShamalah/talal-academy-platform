<?php

namespace App\Services;

use App\Enums\CreditTransactionType;
use App\Enums\InvoiceStatus;
use App\Models\CreditTransaction;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Refund;
use Illuminate\Support\Carbon;

class AccountStatementService
{
    public function __construct(
        private readonly FinancialReportService $financialReportService,
    ) {}

    /**
     * @return array{
     *     events: list<array{date: string, type: string, description: string, student_name: string|null, amount: string, payment_method?: string|null, refund_method?: string|null}>,
     *     summary: array{total_invoiced: string, total_paid: string, total_outstanding: string, total_refunded: string, current_credit_balance: string}
     * }
     */
    public function generateForGuardian(
        Guardian $guardian,
        ?Carbon $fromDate = null,
        ?Carbon $toDate = null,
    ): array {
        $studentIds = $guardian->students()->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($studentIds === []) {
            return [
                'events' => [],
                'summary' => $this->buildSummary($guardian, $studentIds, $fromDate, $toDate),
            ];
        }

        $events = [
            ...$this->collectInvoiceIssuedEvents($studentIds, $fromDate, $toDate),
            ...$this->collectPaymentReceivedEvents($studentIds, $fromDate, $toDate),
            ...$this->collectRefundIssuedEvents($studentIds, $fromDate, $toDate),
            ...$this->collectCreditAdjustmentEvents($guardian, $fromDate, $toDate),
        ];

        usort($events, fn (array $a, array $b) => [$a['date'], $a['type']] <=> [$b['date'], $b['type']]);

        return [
            'events' => $events,
            'summary' => $this->buildSummary($guardian, $studentIds, $fromDate, $toDate),
        ];
    }

    /**
     * @param  list<int>  $studentIds
     * @return list<array{date: string, type: string, description: string, student_name: string|null, amount: string}>
     */
    private function collectInvoiceIssuedEvents(array $studentIds, ?Carbon $fromDate, ?Carbon $toDate): array
    {
        $invoices = Invoice::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', '!=', InvoiceStatus::Cancelled)
            ->with(['student', 'items'])
            ->orderBy('created_at')
            ->get();

        $events = [];

        foreach ($invoices as $invoice) {
            if (! $this->dateInRange($invoice->created_at, $fromDate, $toDate)) {
                continue;
            }

            $events[] = [
                'date' => $invoice->created_at->toIso8601String(),
                'type' => 'invoice_issued',
                'description' => $this->invoiceBriefDescription($invoice),
                'student_name' => $invoice->student?->full_name,
                'amount' => number_format((float) $invoice->total, 3, '.', ''),
            ];
        }

        return $events;
    }

    /**
     * @param  list<int>  $studentIds
     * @return list<array{date: string, type: string, description: string, student_name: string|null, amount: string, payment_method: string|null}>
     */
    private function collectPaymentReceivedEvents(array $studentIds, ?Carbon $fromDate, ?Carbon $toDate): array
    {
        $payments = $this->financialReportService->collectPayments($fromDate, $toDate, $studentIds);
        $events = [];

        foreach ($payments as $payment) {
            $events[] = [
                'date' => $payment['date'],
                'type' => 'payment_received',
                'description' => $payment['description'],
                'student_name' => $payment['student_name'],
                'amount' => $payment['amount'],
                'payment_method' => $payment['payment_method'],
            ];
        }

        return $events;
    }

    /**
     * @param  list<int>  $studentIds
     * @return list<array{date: string, type: string, description: string, student_name: string|null, amount: string, refund_method: string}>
     */
    private function collectRefundIssuedEvents(array $studentIds, ?Carbon $fromDate, ?Carbon $toDate): array
    {
        $refunds = Refund::query()
            ->whereHas('invoice', fn ($q) => $q->whereIn('student_id', $studentIds))
            ->with(['invoice.student'])
            ->orderBy('created_at')
            ->get();

        $events = [];

        foreach ($refunds as $refund) {
            if (! $this->dateInRange($refund->created_at, $fromDate, $toDate)) {
                continue;
            }

            $invoice = $refund->invoice;
            $studentName = $invoice?->student?->full_name;

            $events[] = [
                'date' => $refund->created_at->toIso8601String(),
                'type' => 'refund_issued',
                'description' => sprintf(
                    'استرداد — %s (%s)',
                    $invoice ? $this->invoiceBriefDescription($invoice) : 'فاتورة',
                    $refund->reason,
                ),
                'student_name' => $studentName,
                'amount' => number_format((float) $refund->amount, 3, '.', ''),
                'refund_method' => $refund->method?->value,
            ];
        }

        return $events;
    }

    /**
     * @return list<array{date: string, type: string, description: string, student_name: null, amount: string}>
     */
    private function collectCreditAdjustmentEvents(Guardian $guardian, ?Carbon $fromDate, ?Carbon $toDate): array
    {
        $transactions = CreditTransaction::query()
            ->where('guardian_id', $guardian->id)
            ->where('type', CreditTransactionType::ManualAdjustment)
            ->orderBy('created_at')
            ->get();

        $events = [];

        foreach ($transactions as $transaction) {
            if (! $this->dateInRange($transaction->created_at, $fromDate, $toDate)) {
                continue;
            }

            $events[] = [
                'date' => $transaction->created_at->toIso8601String(),
                'type' => 'credit_adjustment',
                'description' => $transaction->notes ?? 'تعديل رصيد يدوي',
                'student_name' => null,
                'amount' => number_format((float) $transaction->amount, 3, '.', ''),
            ];
        }

        return $events;
    }

    /**
     * @param  list<int>  $studentIds
     * @return array{total_invoiced: string, total_paid: string, total_outstanding: string, total_refunded: string, current_credit_balance: string}
     */
    private function buildSummary(
        Guardian $guardian,
        array $studentIds,
        ?Carbon $fromDate,
        ?Carbon $toDate,
    ): array {
        if ($studentIds === []) {
            return [
                'total_invoiced' => '0.000',
                'total_paid' => '0.000',
                'total_outstanding' => '0.000',
                'total_refunded' => '0.000',
                'current_credit_balance' => $guardian->credit_balance,
            ];
        }

        $invoicesQuery = Invoice::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', '!=', InvoiceStatus::Cancelled);

        if ($fromDate) {
            $invoicesQuery->whereDate('created_at', '>=', $fromDate->toDateString());
        }
        if ($toDate) {
            $invoicesQuery->whereDate('created_at', '<=', $toDate->toDateString());
        }

        $totalInvoiced = (float) $invoicesQuery->sum('total');

        $payments = $this->financialReportService->collectPayments($fromDate, $toDate, $studentIds);
        $totalPaid = $payments->sum(fn (array $p) => (float) $p['amount']);

        $refundsQuery = Refund::query()
            ->whereHas('invoice', fn ($q) => $q->whereIn('student_id', $studentIds));

        if ($fromDate) {
            $refundsQuery->whereDate('created_at', '>=', $fromDate->toDateString());
        }
        if ($toDate) {
            $refundsQuery->whereDate('created_at', '<=', $toDate->toDateString());
        }

        $totalRefunded = (float) $refundsQuery->sum('amount');

        return [
            'total_invoiced' => number_format($totalInvoiced, 3, '.', ''),
            'total_paid' => number_format($totalPaid, 3, '.', ''),
            'total_outstanding' => number_format(max(0, $totalInvoiced - $totalPaid), 3, '.', ''),
            'total_refunded' => number_format($totalRefunded, 3, '.', ''),
            'current_credit_balance' => $guardian->credit_balance,
        ];
    }

    private function invoiceBriefDescription(Invoice $invoice): string
    {
        $studentName = $invoice->student?->full_name ?? 'طالب';
        $brief = $invoice->items->first()?->description ?? $invoice->invoice_number;

        return "{$studentName} — {$brief}";
    }

    private function dateInRange(?Carbon $date, ?Carbon $fromDate, ?Carbon $toDate): bool
    {
        if ($date === null) {
            return false;
        }

        if ($fromDate && $date->lt($fromDate->copy()->startOfDay())) {
            return false;
        }

        if ($toDate && $date->gt($toDate->copy()->endOfDay())) {
            return false;
        }

        return true;
    }
}
