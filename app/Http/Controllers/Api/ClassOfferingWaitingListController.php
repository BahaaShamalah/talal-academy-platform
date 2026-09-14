<?php

namespace App\Http\Controllers\Api;

use App\Enums\EnrollmentStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Enrollment\EnrollFromWaitingListRequest;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\StudentResource;
use App\Models\ClassOffering;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Services\AutoEnrollmentService;
use App\Services\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ClassOfferingWaitingListController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
        private readonly AutoEnrollmentService $autoEnrollmentService,
    ) {}

    public function waitingList(Request $request, ClassOffering $classOffering)
    {
        $classOffering->loadMissing(['grade', 'period']);

        $subscriptions = StudentPlanSubscription::query()
            ->whereIn('status', [
                SubscriptionStatus::Active->value,
                SubscriptionStatus::PendingPayment->value,
            ])
            ->when(
                $classOffering->period_id,
                fn ($q) => $q->where('period_id', $classOffering->period_id),
            )
            ->with(['plan.grade.subjects', 'plan.educationalStage', 'plan.subject', 'plan.productType', 'selectedSubjects.subject', 'student.currentGrade'])
            ->get()
            ->filter(function (StudentPlanSubscription $subscription) use ($classOffering) {
                if (! $classOffering->matchesStudentGender($subscription->student->gender)) {
                    return false;
                }

                if (! $subscription->plan?->coversGradeId((int) $classOffering->grade_id)) {
                    return false;
                }

                $coveredIds = collect($this->autoEnrollmentService->getCoveredSubjects($subscription))
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id);

                return $coveredIds->contains((int) $classOffering->subject_id);
            });

        $studentIds = $subscriptions
            ->pluck('student_id')
            ->unique()
            ->filter(function (int $studentId) use ($classOffering) {
                return ! Enrollment::query()
                    ->join('class_offerings', 'class_offerings.id', '=', 'enrollments.class_offering_id')
                    ->where('enrollments.student_id', $studentId)
                    ->where('class_offerings.grade_id', $classOffering->grade_id)
                    ->where('class_offerings.subject_id', $classOffering->subject_id)
                    ->when(
                        $classOffering->period_id,
                        fn ($q) => $q->where('class_offerings.period_id', $classOffering->period_id),
                    )
                    ->whereIn('enrollments.status', [
                        EnrollmentStatus::Active->value,
                        EnrollmentStatus::PendingPayment->value,
                    ])
                    ->exists();
            })
            ->values();

        $students = Student::query()
            ->whereIn('id', $studentIds)
            ->with(['guardian', 'currentGrade'])
            ->withCount('enrollments')
            ->get();

        return StudentResource::collection($students);
    }

    public function enrollFromWaitingList(
        Request $request,
        EnrollFromWaitingListRequest $enrollRequest,
        ClassOffering $classOffering,
    ): JsonResponse {
        $studentId = (int) $enrollRequest->validated('student_id');

        if (! $this->studentIsInWaitingList($classOffering, $studentId)) {
            throw ValidationException::withMessages([
                'student_id' => ['الطالب غير موجود في قائمة تعارضات الجدول لعرض هذه المادة.'],
            ])->status(422);
        }

        try {
            $enrollment = $this->enrollmentService->create([
                'student_id' => $studentId,
                'class_offering_id' => $classOffering->id,
                'status' => EnrollmentStatus::Active->value,
            ], (int) $request->user()->id, 'waiting_list_enrolled');


            return response()->json(
                (new EnrollmentResource(
                    $enrollment->load([
                        'student',
                        'classOffering.subject',
                        'classOffering.teacher',
                        'classOffering.hall',
                        'classOffering.schedules',
                        'classOffering.grade',
                    ])
                ))->resolve(),
            );
        } catch (ConflictHttpException $e) {
            throw new ConflictHttpException('لا يمكن تسكين الطالب: '.$e->getMessage());
        }
    }

    private function studentIsInWaitingList(ClassOffering $classOffering, int $studentId): bool
    {
        $covers = StudentPlanSubscription::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [
                SubscriptionStatus::Active->value,
                SubscriptionStatus::PendingPayment->value,
            ])
            ->when(
                $classOffering->period_id,
                fn ($q) => $q->where('period_id', $classOffering->period_id),
            )
            ->with(['plan.grade.subjects', 'plan.educationalStage', 'plan.subject', 'plan.productType', 'selectedSubjects.subject', 'student.currentGrade'])
            ->get()
            ->contains(function (StudentPlanSubscription $subscription) use ($classOffering) {
                if (! $classOffering->matchesStudentGender($subscription->student->gender)) {
                    return false;
                }

                if (! $subscription->plan?->coversGradeId((int) $classOffering->grade_id)) {
                    return false;
                }

                return collect($this->autoEnrollmentService->getCoveredSubjects($subscription))
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->contains((int) $classOffering->subject_id);
            });

        if (! $covers) {
            return false;
        }

        $hasActiveEnrollment = Enrollment::query()
            ->join('class_offerings', 'class_offerings.id', '=', 'enrollments.class_offering_id')
            ->where('enrollments.student_id', $studentId)
            ->where('class_offerings.grade_id', $classOffering->grade_id)
            ->where('class_offerings.subject_id', $classOffering->subject_id)
            ->when(
                $classOffering->period_id,
                fn ($q) => $q->where('class_offerings.period_id', $classOffering->period_id),
            )
            ->whereIn('enrollments.status', [
                EnrollmentStatus::Active->value,
                EnrollmentStatus::PendingPayment->value,
            ])
            ->exists();

        return ! $hasActiveEnrollment;
    }
}
