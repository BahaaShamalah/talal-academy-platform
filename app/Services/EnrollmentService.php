<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\ClassOffering;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class EnrollmentService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Enrollment>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Enrollment::class)
            ->allowedFilters(
                AllowedFilter::exact('student_id'),
                AllowedFilter::exact('class_offering_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('grade_id', function ($query, $value): void {
                    $query->whereHas('classOffering', fn ($q) => $q->where('grade_id', $value));
                }),
                AllowedFilter::callback('subject_id', function ($query, $value): void {
                    $query->whereHas('classOffering', fn ($q) => $q->where('subject_id', $value));
                }),
                AllowedFilter::callback('grade_section_id', function ($query, $value): void {
                    $query->whereHas('classOffering', fn ($q) => $q->where('grade_section_id', $value));
                }),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('student'),
                AllowedInclude::relationship('classOffering'),
                AllowedInclude::relationship('classOffering.subject'),
                AllowedInclude::relationship('classOffering.grade'),
            )
            ->with([
                'student.currentGrade.educationalStage',
                'classOffering.subject',
                'classOffering.grade',
            ])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?int $createdBy = null, ?string $notificationEvent = 'enrollment_created'): Enrollment
    {
        $classOfferingId = (int) $data['class_offering_id'];
        $studentId = (int) $data['student_id'];

        $student = Student::query()->findOrFail($studentId);
        $classOffering = ClassOffering::query()->findOrFail($classOfferingId);
        app(FreezeService::class)->assertStudentNotFrozen(
            $student,
            $classOffering->period_id ? (int) $classOffering->period_id : null,
        );

        $this->assertNoActiveEnrollment($studentId, $classOfferingId);

        $enrollment = Enrollment::query()->create([
            ...$data,
            'status' => $data['status'] ?? EnrollmentStatus::Active->value,
            'enrolled_at' => $data['enrolled_at'] ?? now(),
            'created_by' => $createdBy,
        ]);

        if ($notificationEvent) {
            $enrollment->load(['student.guardian', 'classOffering.subject', 'classOffering.grade']);

            $this->notificationService->notifyStudentGuardian($enrollment->student, $notificationEvent, [
                'subject' => $enrollment->classOffering?->subject?->name ?? '',
                'grade' => $enrollment->classOffering?->grade?->name ?? '',
            ]);
        }

        return $enrollment;
    }

    /**
     * @param  array{status?: string, class_offering_id?: int}  $data
     */
    public function update(Enrollment $enrollment, array $data): Enrollment
    {
        $oldClassOfferingId = (int) $enrollment->class_offering_id;

        if (isset($data['class_offering_id']) && (int) $data['class_offering_id'] !== $oldClassOfferingId) {
            $this->assertNoActiveEnrollment(
                $enrollment->student_id,
                (int) $data['class_offering_id'],
                $enrollment->id,
            );
        }

        $enrollment->update($data);
        $enrollment = $enrollment->refresh();

        if (isset($data['class_offering_id']) && (int) $data['class_offering_id'] !== $oldClassOfferingId) {
            AuditLogService::log(
                'student.transferred_group',
                $enrollment,
                sprintf(
                    'نقل الطالب #%d من شعبة #%d إلى شعبة #%d',
                    $enrollment->student_id,
                    $oldClassOfferingId,
                    (int) $data['class_offering_id'],
                ),
                ['class_offering_id' => $oldClassOfferingId],
                ['class_offering_id' => (int) $data['class_offering_id']],
                auth()->user(),
            );
        }

        return $enrollment;
    }

    /**
     * @param  list<array{class_offering_id: int, status: string}>  $assignments
     * @return Collection<int, Enrollment>
     */
    public function syncForStudent(Student $student, array $assignments, int $createdBy): Collection
    {
        $freedIds = [];

        $result = DB::transaction(function () use ($student, $assignments, $createdBy, &$freedIds) {
            $desired = collect($assignments)->keyBy('class_offering_id');
            $existing = Enrollment::query()
                ->where('student_id', $student->id)
                ->get()
                ->keyBy('class_offering_id');

            foreach ($existing as $classOfferingId => $enrollment) {
                if (! $desired->has($classOfferingId)) {
                    $freedIds[] = (int) $enrollment->class_offering_id;
                    $enrollment->delete();
                }
            }

            foreach ($desired as $classOfferingId => $assignment) {
                $classOfferingId = (int) $classOfferingId;
                $status = $assignment['status'];

                if ($existing->has($classOfferingId)) {
                    $existing[$classOfferingId]->update(['status' => $status]);

                    continue;
                }

                $classOffering = ClassOffering::query()->findOrFail($classOfferingId);
                app(FreezeService::class)->assertStudentNotFrozen(
                    $student,
                    $classOffering->period_id ? (int) $classOffering->period_id : null,
                );

                $this->assertNoActiveEnrollment($student->id, $classOfferingId);

                Enrollment::query()->create([
                    'student_id' => $student->id,
                    'class_offering_id' => $classOfferingId,
                    'status' => $status,
                    'enrolled_at' => now(),
                    'created_by' => $createdBy,
                ]);
            }

            return Enrollment::query()
                ->where('student_id', $student->id)
                ->with(['classOffering.subject', 'classOffering.grade', 'classOffering.gradeSection'])
                ->get();
        });

        foreach (array_unique($freedIds) as $classOfferingId) {
            $classOffering = ClassOffering::query()
                ->with(['schedules'])
                ->find($classOfferingId);
            if ($classOffering) {
                $this->autoEnrollment()->retryWaitingStudents($classOffering);
            }
        }

        return $result;
    }

    /**
     * @param  array{status: string}  $data
     */
    public function updateStatus(Enrollment $enrollment, array $data): Enrollment
    {
        $previous = $enrollment->status instanceof EnrollmentStatus
            ? $enrollment->status
            : EnrollmentStatus::from((string) $enrollment->status);

        $enrollment->update(['status' => $data['status']]);
        $enrollment->refresh();

        $wasOccupying = in_array($previous, [
            EnrollmentStatus::Active,
            EnrollmentStatus::PendingPayment,
        ], true);

        $now = $enrollment->status instanceof EnrollmentStatus
            ? $enrollment->status
            : EnrollmentStatus::from((string) $enrollment->status);

        $nowOccupying = in_array($now, [
            EnrollmentStatus::Active,
            EnrollmentStatus::PendingPayment,
        ], true);

        if ($wasOccupying && ! $nowOccupying) {
            $this->retryWaitingForEnrollment($enrollment);
        }

        return $enrollment;
    }

    public function delete(Enrollment $enrollment): void
    {
        $classOfferingId = (int) $enrollment->class_offering_id;
        $wasOccupying = in_array($enrollment->status, [
            EnrollmentStatus::Active,
            EnrollmentStatus::PendingPayment,
        ], true);

        $enrollment->delete();

        if ($wasOccupying) {
            $classOffering = ClassOffering::query()->with(['schedules'])->find($classOfferingId);
            if ($classOffering) {
                $this->autoEnrollment()->retryWaitingStudents($classOffering);
            }
        }
    }

    private function retryWaitingForEnrollment(Enrollment $enrollment): void
    {
        $classOffering = ClassOffering::query()
            ->with(['schedules'])
            ->find($enrollment->class_offering_id);

        if ($classOffering) {
            $this->autoEnrollment()->retryWaitingStudents($classOffering);
        }
    }

    private function autoEnrollment(): AutoEnrollmentService
    {
        return app(AutoEnrollmentService::class);
    }

    private function assertNoActiveEnrollment(int $studentId, int $classOfferingId, ?int $ignoreEnrollmentId = null): void
    {
        $exists = Enrollment::query()
            ->where('student_id', $studentId)
            ->where('class_offering_id', $classOfferingId)
            ->when($ignoreEnrollmentId, fn ($q) => $q->whereKeyNot($ignoreEnrollmentId))
            ->whereIn('status', [
                EnrollmentStatus::Active,
                EnrollmentStatus::PendingPayment,
            ])
            ->exists();

        if ($exists) {
            throw new ConflictHttpException(
                'الطالب مسجّل مسبقًا في عرض هذه المادة.'
            );
        }
    }
}
