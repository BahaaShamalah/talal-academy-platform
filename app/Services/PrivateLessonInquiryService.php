<?php

namespace App\Services;

use App\Enums\PrivateLessonInquiryStatus;
use App\Models\PrivateLessonInquiry;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PrivateLessonInquiryService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): PrivateLessonInquiry
    {
        $inquiry = PrivateLessonInquiry::query()->create([
            ...$data,
            'status' => PrivateLessonInquiryStatus::New,
        ])->load(['grade', 'subject']);

        $this->notifyStaff($inquiry);

        return $inquiry;
    }

    /**
     * @return LengthAwarePaginator<int, PrivateLessonInquiry>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(PrivateLessonInquiry::class)
            ->allowedFilters(AllowedFilter::exact('status'))
            ->with(['grade', 'subject', 'reviewer'])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PrivateLessonInquiry $inquiry, array $data, ?User $actor = null): PrivateLessonInquiry
    {
        if (isset($data['status']) && $data['status'] !== PrivateLessonInquiryStatus::New->value) {
            $data['reviewed_by'] = $actor?->id ?? $inquiry->reviewed_by;
            $data['reviewed_at'] = $inquiry->reviewed_at ?? now();
        }

        $inquiry->update($data);

        return $inquiry->refresh()->load(['grade', 'subject', 'reviewer']);
    }

    private function notifyStaff(PrivateLessonInquiry $inquiry): void
    {
        $variables = [
            'student_name' => $inquiry->student_name,
            'subject' => $inquiry->subject?->name ?? '',
            'grade' => $inquiry->grade?->name ?? '',
            'hours' => $inquiry->hours,
            'phone' => $inquiry->phone,
            'inquiry_id' => $inquiry->id,
        ];

        $meta = [
            'inquiry_id' => $inquiry->id,
            'action_url' => '/dashboard/private-lesson-inquiries',
        ];

        $users = User::permission('private-lessons.view')->get()
            ->concat(User::permission('private-lessons.manage')->get())
            ->unique('id');

        foreach ($users as $user) {
            $this->notificationService->send($user, 'private_lesson_inquiry_requested', $variables, $meta);
        }
    }
}
