<?php

namespace Database\Seeders;

use App\Enums\SupportTicketStatus;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Services\SupportTicketService;
use Illuminate\Database\Seeder;

class SupportTicketSeeder extends Seeder
{
    public function run(): void
    {
        $guardian = Guardian::query()->where('email', 'mohammed.ahmed@example.com')->first()
            ?? Guardian::query()->orderBy('id')->first();
        $admin = User::query()->where('email', 'admin@example.com')->first();
        $student = $guardian
            ? Student::query()->where('guardian_id', $guardian->id)->orderBy('id')->first()
            : null;

        if (! $guardian || ! $admin) {
            return;
        }

        /** @var SupportTicketService $service */
        $service = app(SupportTicketService::class);

        $ticket = $service->createTicket(
            $guardian,
            'أريد تغيير موعد ابني',
            'السلام عليكم، أرغب بتغيير موعد حصة ابني إن أمكن.',
            $student?->id,
        );

        $service->assignTicket($ticket, $admin);
        $ticket = $service->addStaffReply(
            $ticket->fresh(),
            $admin,
            'تم استلام طلبكم وسنراجع الجدول ونوافيكم بالبدائل المتاحة.',
        );

        if ($ticket->status !== SupportTicketStatus::Replied) {
            throw new \RuntimeException('SupportTicketSeeder: expected status replied after staff reply.');
        }
    }
}
