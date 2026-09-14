<?php

namespace App\Services;

use App\Enums\CreditTransactionType;
use App\Enums\InstallmentStatus;
use App\Enums\InvoiceStatus;
use App\Models\CreditTransaction;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreditService
{
    public function balanceForGuardian(Guardian $guardian): string
    {
        $sum = CreditTransaction::query()
            ->where('guardian_id', $guardian->id)
            ->sum('amount');

        return number_format((float) $sum, 3, '.', '');
    }

    /**
     * Applies available guardian credit against an invoice amount (after coupon & family discounts).
     * Returns the amount applied as a formatted decimal string.
     */
    public function applyToInvoice(
        Guardian $guardian,
        Invoice $invoice,
        float $amountDueBeforeCredit,
        ?User $createdBy = null,
    ): string {
        if ($amountDueBeforeCredit <= 0) {
            return '0.000';
        }

        return DB::transaction(function () use ($guardian, $invoice, $amountDueBeforeCredit, $createdBy) {
            $balance = (float) CreditTransaction::query()
                ->where('guardian_id', $guardian->id)
                ->lockForUpdate()
                ->pluck('amount')
                ->sum(fn ($amount) => (float) $amount);

            if ($balance <= 0) {
                return '0.000';
            }

            $toApply = min($balance, $amountDueBeforeCredit);
            $formatted = number_format($toApply, 3, '.', '');

            CreditTransaction::query()->create([
                'guardian_id' => $guardian->id,
                'amount' => number_format(-$toApply, 3, '.', ''),
                'type' => CreditTransactionType::AppliedToInvoice,
                'related_invoice_id' => $invoice->id,
                'created_by' => $createdBy?->id,
            ]);

            return $formatted;
        });
    }

    public function paidAmountOnInvoice(Invoice $invoice): float
    {
        $invoice->loadMissing('installments');

        if ($invoice->hasInstallments()) {
            return (float) $invoice->installments
                ->where('status', InstallmentStatus::Paid)
                ->sum(fn ($i) => (float) $i->amount);
        }

        if ($invoice->status === InvoiceStatus::Paid) {
            return (float) $invoice->total;
        }

        return 0.0;
    }

    public function refundedAmountOnInvoice(Invoice $invoice): float
    {
        return (float) $invoice->refunds()->sum('amount');
    }

    public function refundableAmountOnInvoice(Invoice $invoice): float
    {
        return max(0, $this->paidAmountOnInvoice($invoice) - $this->refundedAmountOnInvoice($invoice));
    }
}
