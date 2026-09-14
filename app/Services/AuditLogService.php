<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ClassSchedule;
use App\Models\ClassSession;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\StudentPlanSubscription;
use App\Models\SubscriptionFreeze;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AuditLogService
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public static function log(
        string $action,
        Model $subject,
        string $description,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $user = null,
        ?Guardian $guardian = null,
    ): AuditLog {
        return AuditLog::query()->create([
            'user_id' => $user?->id,
            'guardian_id' => $guardian?->id,
            'action' => $action,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->getKey(),
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'created_at' => now(),
        ]);
    }

    /**
     * @return LengthAwarePaginator<int, AuditLog>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(AuditLog::class)
            ->with(['user:id,name,email', 'guardian:id,full_name,phone'])
            ->allowedFilters(
                AllowedFilter::exact('action'),
                AllowedFilter::exact('subject_type'),
                AllowedFilter::exact('user_id'),
                AllowedFilter::callback('from', function ($query, $value): void {
                    $query->whereDate('created_at', '>=', $value);
                }),
                AllowedFilter::callback('to', function ($query, $value): void {
                    $query->whereDate('created_at', '<=', $value);
                }),
            )
            ->allowedSorts('created_at', 'id', 'action')
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @return LengthAwarePaginator<int, AuditLog>
     */
    public function listForSubject(string $subjectType, int $subjectId, Request $request): LengthAwarePaginator
    {
        $morphType = $this->resolveSubjectType($subjectType);

        return QueryBuilder::for(AuditLog::class)
            ->where('subject_type', $morphType)
            ->where('subject_id', $subjectId)
            ->with(['user:id,name,email', 'guardian:id,full_name,phone'])
            ->allowedFilters(
                AllowedFilter::exact('action'),
                AllowedFilter::callback('from', function ($query, $value): void {
                    $query->whereDate('created_at', '>=', $value);
                }),
                AllowedFilter::callback('to', function ($query, $value): void {
                    $query->whereDate('created_at', '<=', $value);
                }),
            )
            ->allowedSorts('created_at', 'id', 'action')
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    public function resolveSubjectType(string $subjectType): string
    {
        if (class_exists($subjectType)) {
            return (new $subjectType)->getMorphClass();
        }

        $aliases = [
            'invoice' => Invoice::class,
            'subscription' => StudentPlanSubscription::class,
            'student_plan_subscription' => StudentPlanSubscription::class,
            'enrollment' => Enrollment::class,
            'role' => Role::class,
            'class_session' => ClassSession::class,
            'class_schedule' => ClassSchedule::class,
            'subscription_freeze' => SubscriptionFreeze::class,
            'refund' => Refund::class,
        ];

        $key = strtolower($subjectType);
        if (! isset($aliases[$key])) {
            throw new NotFoundHttpException('نوع السجل غير معروف.');
        }

        return (new $aliases[$key])->getMorphClass();
    }
}
