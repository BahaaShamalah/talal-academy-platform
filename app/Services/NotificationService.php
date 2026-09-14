<?php

namespace App\Services;

use App\Contracts\SmsServiceInterface;
use App\Enums\NotificationChannel;
use App\Models\AppNotification;
use App\Models\Guardian;
use App\Models\NotificationTemplate;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class NotificationService
{
    public function __construct(
        private readonly SmsServiceInterface $smsService,
    ) {}

    /**
     * @param  array<string, string|int|float|null>  $variables
     * @param  array<string, mixed>|null  $meta
     * @return list<AppNotification>
     */
    public function notifyUsersWithPermission(string $permission, string $eventKey, array $variables = [], ?array $meta = null): array
    {
        $created = [];

        User::permission($permission)->get()->each(function (User $user) use ($eventKey, $variables, $meta, &$created) {
            $created = array_merge($created, $this->send($user, $eventKey, $variables, $meta));
        });

        return $created;
    }

    /**
     * @param  array<string, string|int|float|null>  $variables
     * @param  array<string, mixed>|null  $meta
     * @return list<AppNotification>
     */
    public function notifyStudentGuardian(Student $student, string $eventKey, array $variables = [], ?array $meta = null): array
    {
        $student->loadMissing('guardian');
        $guardian = $student->guardian;

        if (! $guardian) {
            return [];
        }

        if (! isset($variables['student_name'])) {
            $variables['student_name'] = $student->full_name;
        }

        return $this->send($guardian, $eventKey, $variables, $meta);
    }

    /**
     * @param  array<string, string|int|float|null>  $variables
     * @return list<AppNotification>
     */
    public function send(Model $notifiable, string $eventKey, array $variables = [], ?array $meta = null): array
    {
        $templates = NotificationTemplate::query()
            ->where('event_key', $eventKey)
            ->where('is_active', true)
            ->get();

        $created = [];

        foreach ($templates as $template) {
            $subject = $this->render($template->subject, $variables);
            $body = $this->render($template->body_template, $variables);

            $notification = AppNotification::query()->create([
                'notifiable_type' => $notifiable->getMorphClass(),
                'notifiable_id' => $notifiable->getKey(),
                'event_key' => $eventKey,
                'channel' => $template->channel,
                'subject' => $subject,
                'body' => $body,
                'meta' => $meta,
                'is_read' => false,
                'created_at' => now(),
            ]);

            $this->dispatchChannel($notifiable, $template->channel, $subject, $body);

            $created[] = $notification;
        }

        return $created;
    }

    /**
     * @return LengthAwarePaginator<int, AppNotification>
     */
    public function listForNotifiable(Model $notifiable, Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(AppNotification::class)
            ->where('notifiable_type', $notifiable->getMorphClass())
            ->where('notifiable_id', $notifiable->getKey())
            ->allowedFilters(
                AllowedFilter::exact('is_read'),
                AllowedFilter::exact('channel'),
                AllowedFilter::exact('event_key'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 20))
            ->appends($request->query());
    }

    public function markRead(AppNotification $notification, Model $notifiable): AppNotification
    {
        if ($notification->notifiable_type !== $notifiable->getMorphClass()
            || (int) $notification->notifiable_id !== (int) $notifiable->getKey()) {
            throw new AccessDeniedHttpException('لا يمكنك تعديل هذا الإشعار.');
        }

        if (! $notification->is_read) {
            $notification->forceFill([
                'is_read' => true,
                'read_at' => now(),
            ])->save();
        }

        return $notification->refresh();
    }

    public function findOwnedOrFail(int $id, Model $notifiable): AppNotification
    {
        $notification = AppNotification::query()->find($id);

        if (! $notification) {
            throw new NotFoundHttpException('الإشعار غير موجود.');
        }

        if ($notification->notifiable_type !== $notifiable->getMorphClass()
            || (int) $notification->notifiable_id !== (int) $notifiable->getKey()) {
            throw new AccessDeniedHttpException('لا يمكنك الوصول لهذا الإشعار.');
        }

        return $notification;
    }

    /**
     * @param  array<string, string|int|float|null>  $variables
     */
    private function render(?string $template, array $variables): ?string
    {
        if ($template === null) {
            return null;
        }

        $replacements = [];
        foreach ($variables as $key => $value) {
            $replacements['{{'.$key.'}}'] = (string) ($value ?? '');
        }

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    private function dispatchChannel(Model $notifiable, NotificationChannel $channel, ?string $subject, string $body): void
    {
        match ($channel) {
            NotificationChannel::InApp => null,
            NotificationChannel::Email => $this->sendEmail($notifiable, $subject, $body),
            NotificationChannel::Whatsapp => $this->sendWhatsapp($notifiable, $body),
        };
    }

    private function sendEmail(Model $notifiable, ?string $subject, string $body): void
    {
        $email = null;
        if ($notifiable instanceof Guardian || $notifiable instanceof User) {
            $email = $notifiable->email;
        }

        if (! $email) {
            Log::info('notification.email_skipped_no_address', [
                'notifiable_type' => $notifiable->getMorphClass(),
                'notifiable_id' => $notifiable->getKey(),
            ]);

            return;
        }

        try {
            Mail::raw($body, function ($message) use ($email, $subject) {
                $message->to($email)->subject($subject ?: 'إشعار من المعهد');
            });
        } catch (\Throwable $e) {
            Log::warning('notification.email_failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendWhatsapp(Model $notifiable, string $body): void
    {
        $phone = null;
        if ($notifiable instanceof Guardian || $notifiable instanceof User) {
            $phone = $notifiable->phone;
        }

        if (! $phone) {
            Log::info('notification.whatsapp_skipped_no_phone', [
                'notifiable_type' => $notifiable->getMorphClass(),
                'notifiable_id' => $notifiable->getKey(),
            ]);

            return;
        }

        $this->smsService->send($phone, $body);
    }
}
