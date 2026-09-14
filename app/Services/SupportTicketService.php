<?php

namespace App\Services;

use App\Enums\SupportTicketSenderType;
use App\Enums\SupportTicketStatus;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class SupportTicketService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, SupportTicket>
     */
    public function listAdmin(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(SupportTicket::class)
            ->with(['guardian', 'student', 'assignee'])
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('assigned_to'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @return LengthAwarePaginator<int, SupportTicket>
     */
    public function listForGuardian(Guardian $guardian, Request $request): LengthAwarePaginator
    {
        return SupportTicket::query()
            ->where('guardian_id', $guardian->id)
            ->with(['student', 'assignee'])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    public function createTicket(
        Guardian $guardian,
        string $subject,
        string $firstMessage,
        ?int $studentId = null,
    ): SupportTicket {
        if ($studentId !== null) {
            $this->assertGuardianOwnsStudent($guardian, $studentId);
        }

        return DB::transaction(function () use ($guardian, $subject, $firstMessage, $studentId) {
            $ticket = SupportTicket::query()->create([
                'guardian_id' => $guardian->id,
                'student_id' => $studentId,
                'subject' => $subject,
                'status' => SupportTicketStatus::New,
            ]);

            SupportTicketMessage::query()->create([
                'ticket_id' => $ticket->id,
                'sender_type' => SupportTicketSenderType::Guardian,
                'sender_guardian_id' => $guardian->id,
                'sender_user_id' => null,
                'message' => $firstMessage,
                'created_at' => now(),
            ]);

            return $ticket->load(['guardian', 'student', 'assignee', 'messages.senderGuardian', 'messages.senderUser']);
        })->tap(function (SupportTicket $ticket) use ($guardian) {
            $this->notificationService->notifyUsersWithPermission('support-tickets.manage', 'support_ticket_created', [
                'guardian_name' => $guardian->full_name,
                'subject' => $ticket->subject,
                'ticket_id' => $ticket->id,
            ], [
                'action_url' => '/dashboard/support-tickets',
                'ticket_id' => $ticket->id,
            ]);
        });
    }

    public function addGuardianReply(SupportTicket $ticket, Guardian $guardian, string $message): SupportTicket
    {
        $this->assertGuardianOwnsTicket($ticket, $guardian);

        $ticket = DB::transaction(function () use ($ticket, $guardian, $message) {
            SupportTicketMessage::query()->create([
                'ticket_id' => $ticket->id,
                'sender_type' => SupportTicketSenderType::Guardian,
                'sender_guardian_id' => $guardian->id,
                'sender_user_id' => null,
                'message' => $message,
                'created_at' => now(),
            ]);

            if (in_array($ticket->status, [SupportTicketStatus::Replied, SupportTicketStatus::Closed], true)) {
                $ticket->update(['status' => SupportTicketStatus::InProgress]);
            }

            return $ticket->refresh()->load([
                'guardian',
                'student',
                'assignee',
                'messages.senderGuardian',
                'messages.senderUser',
            ]);
        });

        $vars = [
            'subject' => $ticket->subject,
            'ticket_id' => $ticket->id,
        ];
        $meta = ['action_url' => '/dashboard/support-tickets', 'ticket_id' => $ticket->id];

        if ($ticket->assignee) {
            $this->notificationService->send($ticket->assignee, 'support_ticket_guardian_reply', $vars, $meta);
        } else {
            $this->notificationService->notifyUsersWithPermission('support-tickets.manage', 'support_ticket_guardian_reply', $vars, $meta);
        }

        return $ticket;
    }

    public function addStaffReply(SupportTicket $ticket, User $user, string $message): SupportTicket
    {
        $ticket = DB::transaction(function () use ($ticket, $user, $message) {
            SupportTicketMessage::query()->create([
                'ticket_id' => $ticket->id,
                'sender_type' => SupportTicketSenderType::Staff,
                'sender_guardian_id' => null,
                'sender_user_id' => $user->id,
                'message' => $message,
                'created_at' => now(),
            ]);

            $ticket->update(['status' => SupportTicketStatus::Replied]);

            return $ticket->refresh()->load([
                'guardian',
                'student',
                'assignee',
                'messages.senderGuardian',
                'messages.senderUser',
            ]);
        });

        if ($ticket->guardian) {
            $this->notificationService->send($ticket->guardian, 'support_ticket_staff_reply', [
                'subject' => $ticket->subject,
                'ticket_id' => $ticket->id,
            ], ['ticket_id' => $ticket->id]);
        }

        return $ticket;
    }

    public function assignTicket(SupportTicket $ticket, User $user): SupportTicket
    {
        $payload = ['assigned_to' => $user->id];

        if ($ticket->status === SupportTicketStatus::New) {
            $payload['status'] = SupportTicketStatus::InProgress;
        }

        $ticket->update($payload);

        return $ticket->refresh()->load([
            'guardian',
            'student',
            'assignee',
            'messages.senderGuardian',
            'messages.senderUser',
        ]);
    }

    public function closeTicket(SupportTicket $ticket): SupportTicket
    {
        $ticket->update(['status' => SupportTicketStatus::Closed]);

        $ticket = $ticket->refresh()->load([
            'guardian',
            'student',
            'assignee',
            'messages.senderGuardian',
            'messages.senderUser',
        ]);

        if ($ticket->guardian) {
            $this->notificationService->send($ticket->guardian, 'support_ticket_closed', [
                'subject' => $ticket->subject,
                'ticket_id' => $ticket->id,
            ], ['ticket_id' => $ticket->id]);
        }

        return $ticket;
    }

    public function findForGuardianOrFail(SupportTicket $ticket, Guardian $guardian): SupportTicket
    {
        $this->assertGuardianOwnsTicket($ticket, $guardian);

        return $ticket->load([
            'guardian',
            'student',
            'assignee',
            'messages.senderGuardian',
            'messages.senderUser',
        ]);
    }

    public function findAdmin(SupportTicket $ticket): SupportTicket
    {
        return $ticket->load([
            'guardian',
            'student',
            'assignee',
            'messages.senderGuardian',
            'messages.senderUser',
        ]);
    }

    private function assertGuardianOwnsTicket(SupportTicket $ticket, Guardian $guardian): void
    {
        if ((int) $ticket->guardian_id !== (int) $guardian->id) {
            throw new AccessDeniedHttpException('لا يمكنك الوصول لهذه التذكرة.');
        }
    }

    private function assertGuardianOwnsStudent(Guardian $guardian, int $studentId): void
    {
        $owns = Student::query()
            ->whereKey($studentId)
            ->where('guardian_id', $guardian->id)
            ->exists();

        if (! $owns) {
            throw ValidationException::withMessages([
                'student_id' => ['الطالب المحدد لا ينتمي لحسابك.'],
            ])->status(422);
        }
    }
}
