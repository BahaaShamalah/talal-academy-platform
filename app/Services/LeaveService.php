<?php

namespace App\Services;

use App\Enums\ClassSessionStatus;
use App\Enums\LeaveRequestStatus;
use App\Models\ClassSession;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class LeaveService
{
    public function __construct(
        private readonly ScheduleConflictService $scheduleConflictService,
        private readonly ClassSessionService $classSessionService,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return array{leave_request: LeaveRequest, insufficient_balance: bool, requested_days: int, remaining_days: int}
     */
    public function requestLeave(
        User $user,
        LeaveType $leaveType,
        Carbon $startDate,
        Carbon $endDate,
        string $reason,
        ?int $attachmentMediaId = null,
    ): array {
        if ($endDate->lt($startDate)) {
            throw ValidationException::withMessages([
                'end_date' => ['تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو مساويًا له.'],
            ])->status(422);
        }

        $requestedDays = $this->dayCount($startDate, $endDate);
        $year = (int) $startDate->year;
        $remainingDays = $this->remainingDays($user, $leaveType, $year);
        $insufficientBalance = $requestedDays > $remainingDays;

        $leaveRequest = LeaveRequest::query()->create([
            'user_id' => $user->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'reason' => $reason,
            'status' => LeaveRequestStatus::Pending,
            'attachment_media_id' => $attachmentMediaId,
        ])->load(['user', 'leaveType', 'attachment', 'reviewer']);

        $this->notificationService->notifyUsersWithPermission('leaves.manage', 'leave_request_submitted', [
            'staff_name' => $user->name,
            'leave_type' => $leaveRequest->leaveType?->name,
            'start_date' => $leaveRequest->start_date?->toDateString() ?? (string) $leaveRequest->start_date,
            'end_date' => $leaveRequest->end_date?->toDateString() ?? (string) $leaveRequest->end_date,
        ], [
            'action_url' => '/dashboard/leave-requests',
            'leave_request_id' => $leaveRequest->id,
        ]);

        return [
            'leave_request' => $leaveRequest,
            'insufficient_balance' => $insufficientBalance,
            'requested_days' => $requestedDays,
            'remaining_days' => $remainingDays,
        ];
    }

    public function reviewLeave(
        LeaveRequest $leaveRequest,
        string $decision,
        User $reviewedBy,
        ?string $notes = null,
    ): LeaveRequest {
        if ($leaveRequest->status !== LeaveRequestStatus::Pending) {
            throw new ConflictHttpException('تمت مراجعة طلب الإجازة مسبقاً.');
        }

        $leaveRequest = DB::transaction(function () use ($leaveRequest, $decision, $reviewedBy, $notes) {
            $leaveRequest->loadMissing(['user', 'leaveType']);

            if ($decision === LeaveRequestStatus::Approved->value) {
                $this->deductBalance($leaveRequest);
                $this->flagSessionsNeedingSubstitute($leaveRequest);
                $status = LeaveRequestStatus::Approved;
            } else {
                $status = LeaveRequestStatus::Rejected;
            }

            $leaveRequest->update([
                'status' => $status,
                'reviewed_by' => $reviewedBy->id,
                'reviewed_at' => now(),
                'review_notes' => $notes,
            ]);

            return $leaveRequest->refresh()->load(['user', 'leaveType', 'attachment', 'reviewer']);
        });

        if ($leaveRequest->user) {
            $vars = [
                'leave_type' => $leaveRequest->leaveType?->name,
                'start_date' => $leaveRequest->start_date?->toDateString() ?? (string) $leaveRequest->start_date,
                'end_date' => $leaveRequest->end_date?->toDateString() ?? (string) $leaveRequest->end_date,
            ];

            if ($leaveRequest->status === LeaveRequestStatus::Approved) {
                $this->notificationService->send($leaveRequest->user, 'leave_request_approved', $vars);
            } elseif ($leaveRequest->status === LeaveRequestStatus::Rejected) {
                $this->notificationService->send($leaveRequest->user, 'leave_request_rejected', $vars);
            }
        }

        return $leaveRequest;
    }

    /**
     * @return LengthAwarePaginator<int, LeaveRequest>
     */
    public function listRequests(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(LeaveRequest::class)
            ->with(['user', 'leaveType', 'attachment', 'reviewer'])
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('user_id'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @return Collection<int, LeaveBalance>
     */
    public function balancesForUser(User $user, ?int $year = null): Collection
    {
        $year ??= (int) now()->year;

        return LeaveBalance::query()
            ->with('leaveType')
            ->where('user_id', $user->id)
            ->where('year', $year)
            ->orderBy('leave_type_id')
            ->get();
    }

    /**
     * @return list<array{session: ClassSession, suggestions: list<array{id: int, name: string, email: string|null}>}>
     */
    public function substituteSuggestions(LeaveRequest $leaveRequest): array
    {
        $leaveRequest->loadMissing('user');
        $sessions = $this->sessionsNeedingSubstituteForLeave($leaveRequest);

        $result = [];

        foreach ($sessions as $session) {
            $session->loadMissing(['classOffering.subject', 'classOffering.grade', 'teacher', 'hall']);
            $subjectId = (int) ($session->classOffering?->subject_id ?? 0);
            $suggestions = [];

            if ($subjectId > 0) {
                $candidates = User::query()
                    ->where('is_teaching_staff', true)
                    ->whereKeyNot($leaveRequest->user_id)
                    ->whereHas('staffProfile.subjects', fn ($q) => $q->where('subjects.id', $subjectId))
                    ->orderBy('name')
                    ->get();

                foreach ($candidates as $candidate) {
                    if ($this->hasApprovedLeaveOnDate($candidate->id, $session->session_date?->toDateString() ?? '')) {
                        continue;
                    }

                    if ($this->teacherHasSessionConflict($candidate->id, $session)) {
                        continue;
                    }

                    $suggestions[] = [
                        'id' => $candidate->id,
                        'name' => $candidate->name,
                        'email' => $candidate->email,
                    ];
                }
            }

            $result[] = [
                'session' => $session,
                'suggestions' => $suggestions,
            ];
        }

        return $result;
    }

    /**
     * @return array{session: ?ClassSession, conflicts: list<array<string, mixed>>, blocked: bool}
     */
    public function assignSubstitute(ClassSession $session, int $teacherId): array
    {
        $result = $this->classSessionService->update($session, [
            'teacher_id' => $teacherId,
        ]);

        if ($result['blocked']) {
            return $result;
        }

        $updated = $result['session'];
        $updated->forceFill(['needs_substitute' => false])->save();

        Log::info('leave.substitute_assigned', [
            'session_id' => $updated->id,
            'teacher_id' => $teacherId,
            'session_date' => $updated->session_date?->toDateString(),
        ]);

        return [
            'session' => $updated->refresh()->load([
                'classOffering.subject',
                'classOffering.teacher',
                'classOffering.hall',
                'classOffering.grade',
                'classSchedule',
                'teacher',
                'hall',
            ]),
            'conflicts' => $result['conflicts'],
            'blocked' => false,
        ];
    }

    private function deductBalance(LeaveRequest $leaveRequest): void
    {
        $leaveType = $leaveRequest->leaveType;
        $start = $leaveRequest->start_date->copy()->startOfDay();
        $end = $leaveRequest->end_date->copy()->startOfDay();
        $days = $this->dayCount($start, $end);
        $year = (int) $start->year;

        $balance = LeaveBalance::query()->firstOrCreate(
            [
                'user_id' => $leaveRequest->user_id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'total_days' => $leaveType->default_annual_balance,
                'used_days' => 0,
            ],
        );

        $balance->increment('used_days', $days);
    }

    private function flagSessionsNeedingSubstitute(LeaveRequest $leaveRequest): void
    {
        $user = $leaveRequest->user;

        if (! $user?->is_teaching_staff) {
            return;
        }

        $this->queryTeacherScheduledSessions(
            (int) $leaveRequest->user_id,
            $leaveRequest->start_date->toDateString(),
            $leaveRequest->end_date->toDateString(),
        )->update(['needs_substitute' => true]);
    }

    /**
     * @return Collection<int, ClassSession>
     */
    private function sessionsNeedingSubstituteForLeave(LeaveRequest $leaveRequest): Collection
    {
        return $this->queryTeacherScheduledSessions(
            (int) $leaveRequest->user_id,
            $leaveRequest->start_date->toDateString(),
            $leaveRequest->end_date->toDateString(),
        )
            ->where('needs_substitute', true)
            ->with(['classOffering.subject', 'classOffering.grade', 'teacher', 'hall'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get();
    }

    private function queryTeacherScheduledSessions(int $teacherId, string $startDate, string $endDate)
    {
        return ClassSession::query()
            ->where('status', ClassSessionStatus::Scheduled)
            ->whereBetween('session_date', [$startDate, $endDate])
            ->where(function ($query) use ($teacherId) {
                $query->where('teacher_id', $teacherId)
                    ->orWhere(function ($inner) use ($teacherId) {
                        $inner->whereNull('teacher_id')
                            ->whereHas('classOffering', fn ($gs) => $gs->where('teacher_id', $teacherId));
                    });
            });
    }

    private function remainingDays(User $user, LeaveType $leaveType, int $year): int
    {
        $balance = LeaveBalance::query()
            ->where('user_id', $user->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->first();

        if (! $balance) {
            return (int) $leaveType->default_annual_balance;
        }

        return $balance->remainingDays();
    }

    private function dayCount(Carbon $start, Carbon $end): int
    {
        return (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
    }

    private function hasApprovedLeaveOnDate(int $userId, string $date): bool
    {
        if ($date === '') {
            return false;
        }

        return LeaveRequest::query()
            ->where('user_id', $userId)
            ->where('status', LeaveRequestStatus::Approved)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->exists();
    }

    private function teacherHasSessionConflict(int $teacherId, ClassSession $session): bool
    {
        $conflicts = $this->scheduleConflictService->checkSessionConflict(
            teacherId: $teacherId,
            hallId: $session->effectiveHallId(),
            sessionDate: $session->session_date?->toDateString() ?? '',
            startTime: (string) $session->start_time,
            endTime: (string) $session->end_time,
            excludingSessionId: $session->id,
        );

        foreach ($conflicts as $conflict) {
            if (($conflict['resource'] ?? null) === 'teacher') {
                return true;
            }
        }

        return false;
    }
}
