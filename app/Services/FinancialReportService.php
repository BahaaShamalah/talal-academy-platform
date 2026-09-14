<?php

namespace App\Services;

use App\Enums\InstallmentStatus;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FinancialReportService
{
    /**
     * Actual payments: paid installments + non-installment invoices marked paid.
     *
     * @param  list<int>|null  $studentIds  null = all students
     * @return Collection<int, array{date: string, amount: string, payment_method: string|null, student_id: int, student_name: string|null, description: string}>
     */
    public function collectPayments(?Carbon $fromDate, ?Carbon $toDate, ?array $studentIds = null): Collection
    {
        $payments = collect();

        $installmentQuery = InvoiceInstallment::query()
            ->where('status', InstallmentStatus::Paid)
            ->whereNotNull('paid_at')
            ->with(['invoice.student']);

        if ($studentIds !== null) {
            $installmentQuery->whereHas('invoice', fn ($q) => $q->whereIn('student_id', $studentIds));
        }

        if ($fromDate) {
            $installmentQuery->whereDate('paid_at', '>=', $fromDate->toDateString());
        }
        if ($toDate) {
            $installmentQuery->whereDate('paid_at', '<=', $toDate->toDateString());
        }

        foreach ($installmentQuery->get() as $installment) {
            $invoice = $installment->invoice;
            if (! $invoice) {
                continue;
            }

            $payments->push([
                'date' => $installment->paid_at->toIso8601String(),
                'amount' => number_format((float) $installment->amount, 3, '.', ''),
                'payment_method' => $installment->payment_method?->value,
                'student_id' => (int) $invoice->student_id,
                'student_name' => $invoice->student?->full_name,
                'description' => sprintf(
                    'دفعة #%d — %s (%s)',
                    $installment->sequence,
                    $invoice->student?->full_name ?? 'طالب',
                    $invoice->invoice_number,
                ),
            ]);
        }

        $invoiceQuery = Invoice::query()
            ->where('status', InvoiceStatus::Paid)
            ->whereNotNull('paid_at')
            ->whereDoesntHave('installments')
            ->with('student');

        if ($studentIds !== null) {
            $invoiceQuery->whereIn('student_id', $studentIds);
        }

        if ($fromDate) {
            $invoiceQuery->whereDate('paid_at', '>=', $fromDate->toDateString());
        }
        if ($toDate) {
            $invoiceQuery->whereDate('paid_at', '<=', $toDate->toDateString());
        }

        foreach ($invoiceQuery->get() as $invoice) {
            $payments->push([
                'date' => $invoice->paid_at->toIso8601String(),
                'amount' => number_format((float) $invoice->total, 3, '.', ''),
                'payment_method' => $invoice->payment_method?->value,
                'student_id' => (int) $invoice->student_id,
                'student_name' => $invoice->student?->full_name,
                'description' => sprintf(
                    'دفع فاتورة — %s (%s)',
                    $invoice->student?->full_name ?? 'طالب',
                    $invoice->invoice_number,
                ),
            ]);
        }

        return $payments->sortBy('date')->values();
    }

    /**
     * @return list<array{period: string, total: string}>
     */
    public function revenueSummary(?Carbon $fromDate, ?Carbon $toDate, string $groupBy = 'day'): array
    {
        $this->assertGroupBy($groupBy);

        $payments = $this->collectPayments($fromDate, $toDate);
        $grouped = [];

        foreach ($payments as $payment) {
            $key = $this->periodKey(Carbon::parse($payment['date']), $groupBy);
            $grouped[$key] = ($grouped[$key] ?? 0) + (float) $payment['amount'];
        }

        ksort($grouped);

        return collect($grouped)
            ->map(fn (float $total, string $period) => [
                'period' => $period,
                'total' => number_format($total, 3, '.', ''),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{payment_method: string|null, total: string}>
     */
    public function revenueByPaymentMethod(?Carbon $fromDate, ?Carbon $toDate): array
    {
        $payments = $this->collectPayments($fromDate, $toDate);
        $grouped = [];

        foreach ($payments as $payment) {
            $method = $payment['payment_method'] ?? 'unknown';
            $grouped[$method] = ($grouped[$method] ?? 0) + (float) $payment['amount'];
        }

        arsort($grouped);

        return collect($grouped)
            ->map(fn (float $total, string $method) => [
                'payment_method' => $method === 'unknown' ? null : $method,
                'total' => number_format($total, 3, '.', ''),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{student_id: int, student_name: string, outstanding_amount: string, pending_invoices: int, pending_installments: int}>
     */
    public function outstandingSummary(): array
    {
        $byStudent = [];

        $pendingInstallments = InvoiceInstallment::query()
            ->where('status', InstallmentStatus::Pending)
            ->with(['invoice.student'])
            ->whereHas('invoice', fn ($q) => $q->where('status', '!=', InvoiceStatus::Cancelled))
            ->get();

        foreach ($pendingInstallments as $installment) {
            $invoice = $installment->invoice;
            if (! $invoice?->student_id) {
                continue;
            }

            $studentId = (int) $invoice->student_id;
            $byStudent[$studentId] ??= [
                'student_id' => $studentId,
                'student_name' => $invoice->student?->full_name ?? '',
                'outstanding_amount' => 0.0,
                'pending_invoices' => [],
                'pending_installments' => 0,
            ];

            $byStudent[$studentId]['outstanding_amount'] += (float) $installment->amount;
            $byStudent[$studentId]['pending_installments']++;
            $byStudent[$studentId]['pending_invoices'][$invoice->id] = true;
        }

        $pendingInvoices = Invoice::query()
            ->where('status', InvoiceStatus::Pending)
            ->whereDoesntHave('installments')
            ->with('student')
            ->get();

        foreach ($pendingInvoices as $invoice) {
            $studentId = (int) $invoice->student_id;
            $byStudent[$studentId] ??= [
                'student_id' => $studentId,
                'student_name' => $invoice->student?->full_name ?? '',
                'outstanding_amount' => 0.0,
                'pending_invoices' => [],
                'pending_installments' => 0,
            ];

            $byStudent[$studentId]['outstanding_amount'] += (float) $invoice->total;
            $byStudent[$studentId]['pending_invoices'][$invoice->id] = true;
        }

        $result = collect($byStudent)
            ->map(fn (array $row) => [
                'student_id' => $row['student_id'],
                'student_name' => $row['student_name'],
                'outstanding_amount' => number_format($row['outstanding_amount'], 3, '.', ''),
                'pending_invoices' => count($row['pending_invoices']),
                'pending_installments' => $row['pending_installments'],
            ])
            ->sortByDesc(fn (array $row) => (float) $row['outstanding_amount'])
            ->values()
            ->all();

        return $result;
    }

    private function assertGroupBy(string $groupBy): void
    {
        if (! in_array($groupBy, ['day', 'week', 'month'], true)) {
            throw new \InvalidArgumentException("group_by must be day, week, or month; got: {$groupBy}");
        }
    }

    private function periodKey(Carbon $date, string $groupBy): string
    {
        return match ($groupBy) {
            'week' => $date->copy()->startOfWeek()->toDateString(),
            'month' => $date->format('Y-m'),
            default => $date->toDateString(),
        };
    }
}
