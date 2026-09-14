<?php

namespace App\Services;

use App\Enums\ContactMessageStatus;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ContactMessageService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ContactMessage
    {
        $message = ContactMessage::query()->create([
            ...$data,
            'status' => ContactMessageStatus::New,
        ])->load(['educationalStage']);

        $this->notifyStaff($message);

        return $message;
    }

    /**
     * @return LengthAwarePaginator<int, ContactMessage>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(ContactMessage::class)
            ->allowedFilters(AllowedFilter::exact('status'))
            ->with(['educationalStage', 'reviewer'])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ContactMessage $message, array $data, ?User $actor = null): ContactMessage
    {
        if (isset($data['status']) && $data['status'] !== ContactMessageStatus::New->value) {
            $data['reviewed_by'] = $actor?->id ?? $message->reviewed_by;
            $data['reviewed_at'] = $message->reviewed_at ?? now();
        }

        $message->update($data);

        return $message->refresh()->load(['educationalStage', 'reviewer']);
    }

    private function notifyStaff(ContactMessage $message): void
    {
        $variables = [
            'name' => $message->name,
            'phone' => $message->phone,
            'stage' => $message->educationalStage?->name ?? '—',
            'message' => mb_substr((string) $message->message, 0, 120),
            'contact_id' => $message->id,
        ];

        $meta = [
            'contact_message_id' => $message->id,
            'action_url' => '/dashboard/contact-messages',
        ];

        $users = User::permission('support-tickets.view')->get()
            ->concat(User::permission('support-tickets.manage')->get())
            ->unique('id');

        foreach ($users as $user) {
            $this->notificationService->send($user, 'contact_message_received', $variables, $meta);
        }
    }
}
