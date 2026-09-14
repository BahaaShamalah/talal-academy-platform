<?php

namespace App\Console\Commands;

use App\Enums\InstallmentStatus;
use App\Models\InvoiceInstallment;
use App\Services\InstallmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class NotifyOverdueInstallmentsCommand extends Command
{
    protected $signature = 'notifications:overdue-installments';

    protected $description = 'Send overdue installment notifications to guardians';

    public function handle(InstallmentService $installmentService): int
    {
        $query = InvoiceInstallment::query()
            ->where('status', InstallmentStatus::Pending)
            ->whereDate('due_date', '<', Carbon::today())
            ->with(['invoice.student.guardian']);

        $count = 0;
        $query->orderBy('id')->chunkById(100, function ($rows) use ($installmentService, &$count) {
            foreach ($rows as $installment) {
                if ($installmentService->notifyOverdueIfNeeded($installment)) {
                    $count++;
                }
            }
        });

        $this->info("Sent {$count} overdue installment notification(s).");

        return self::SUCCESS;
    }
}
