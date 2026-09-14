<?php

namespace App\Services;

use App\Enums\InstallmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\AppNotification;
use App\Models\InstallmentTemplate;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class InstallmentService
{
    public function __construct(
        private readonly InvoiceFulfillmentService $invoiceFulfillmentService,
        private readonly NotificationService $notificationService,
    ) {}

    public function generateForInvoice(Invoice $invoice, InstallmentTemplate $template): void
    {
        $total = (float) $invoice->total;
        $percentages = $template->split_percentages;
        $offsets = $template->due_offset_days;
        $baseDate = Carbon::today();

        $amounts = [];
        $allocated = 0.0;

        $lastIndex = count($percentages) - 1;
        for ($i = 0; $i < $lastIndex; $i++) {
            $amount = round($total * ((float) $percentages[$i]) / 100, 3);
            $amounts[] = $amount;
            $allocated += $amount;
        }

        $amounts[] = (float) number_format($total - $allocated, 3, '.', '');

        foreach ($amounts as $index => $amount) {
            InvoiceInstallment::query()->create([
                'invoice_id' => $invoice->id,
                'sequence' => $index + 1,
                'amount' => number_format($amount, 3, '.', ''),
                'due_date' => $baseDate->copy()->addDays((int) $offsets[$index])->toDateString(),
                'status' => InstallmentStatus::Pending,
            ]);
        }
    }

    public function payInstallment(InvoiceInstallment $installment, PaymentMethod $paymentMethod): InvoiceInstallment
    {
        if ($installment->status === InstallmentStatus::Paid) {
            throw new ConflictHttpException('هذه الدفعة مسدَّدة أصلاً');
        }

        return DB::transaction(function () use ($installment, $paymentMethod) {
            $installment = InvoiceInstallment::query()
                ->whereKey($installment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($installment->status === InstallmentStatus::Paid) {
                throw new ConflictHttpException('هذه الدفعة مسدَّدة أصلاً');
            }

            $invoice = Invoice::query()
                ->whereKey($installment->invoice_id)
                ->lockForUpdate()
                ->firstOrFail();

            $hadPaidBefore = InvoiceInstallment::query()
                ->where('invoice_id', $invoice->id)
                ->where('id', '!=', $installment->id)
                ->where('status', InstallmentStatus::Paid)
                ->exists();

            $installment->update([
                'status' => InstallmentStatus::Paid,
                'paid_at' => now(),
                'payment_method' => $paymentMethod,
            ]);

            if (! $hadPaidBefore) {
                $this->invoiceFulfillmentService->activate($invoice);
            }

            $allPaid = ! InvoiceInstallment::query()
                ->where('invoice_id', $invoice->id)
                ->where('status', '!=', InstallmentStatus::Paid)
                ->exists();

            if ($allPaid && $invoice->status === InvoiceStatus::Pending) {
                $invoice->update([
                    'status' => InvoiceStatus::Paid,
                    'paid_at' => now(),
                    'payment_method' => $paymentMethod,
                ]);
            }

            $paid = $installment->refresh()->load(['invoice.student.guardian']);

            $guardian = $paid->invoice?->student?->guardian;
            if ($guardian) {
                $this->notificationService->send($guardian, 'payment_received', [
                    'student_name' => $paid->invoice->student->full_name,
                    'amount' => $paid->amount,
                    'invoice_number' => $paid->invoice->invoice_number.' / قسط '.$paid->sequence,
                ]);
            }

            return $paid;
        });
    }

    /**
     * @return Collection<int, InvoiceInstallment>
     */
    public function listForInvoice(Invoice $invoice): Collection
    {
        return $invoice->installments()
            ->orderBy('sequence')
            ->get();
    }

    public function assertBelongsToInvoice(InvoiceInstallment $installment, Invoice $invoice): void
    {
        if ($installment->invoice_id !== $invoice->id) {
            throw ValidationException::withMessages([
                'installment' => ['الدفعة لا تنتمي لهذه الفاتورة.'],
            ])->status(404);
        }
    }

    /**
     * @return LengthAwarePaginator<int, InvoiceInstallment>
     */
    public function listOverdue(Request $request): LengthAwarePaginator
    {
        $paginator = InvoiceInstallment::query()
            ->where('status', InstallmentStatus::Pending)
            ->whereDate('due_date', '<', Carbon::today())
            ->with(['invoice.student.guardian'])
            ->orderBy('due_date')
            ->orderBy('sequence')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());

        foreach ($paginator->getCollection() as $installment) {
            $this->notifyOverdueIfNeeded($installment);
        }

        return $paginator;
    }

    public function notifyOverdueIfNeeded(InvoiceInstallment $installment): bool
    {
        $student = $installment->invoice?->student;
        $guardian = $student?->guardian;

        if (! $guardian) {
            return false;
        }

        $marker = '(مرجع: '.$installment->id.')';
        $alreadySent = AppNotification::query()
            ->where('notifiable_type', $guardian->getMorphClass())
            ->where('notifiable_id', $guardian->id)
            ->where('event_key', 'invoice_overdue')
            ->where('body', 'like', '%'.$marker.'%')
            ->exists();

        if ($alreadySent) {
            return false;
        }

        $this->notificationService->send($guardian, 'invoice_overdue', [
            'student_name' => $student->full_name,
            'amount' => $installment->amount,
            'due_date' => $installment->due_date?->toDateString() ?? (string) $installment->due_date,
            'installment_id' => $installment->id,
        ]);

        return true;
    }
}
