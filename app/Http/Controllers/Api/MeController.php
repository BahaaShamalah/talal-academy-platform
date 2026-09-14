<?php

namespace App\Http\Controllers\Api;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClassOfferingResource;
use App\Http\Resources\EvaluationResource;
use App\Http\Resources\LeaveBalanceResource;
use App\Http\Resources\LeaveRequestResource;
use App\Http\Resources\StudentResource;
use App\Models\Evaluation;
use App\Models\Student;
use App\Services\LeaveService;
use App\Services\TeacherSchedulePdfService;
use App\Services\TeacherScheduleService;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class MeController extends Controller
{
    public function __construct(
        private readonly TeacherScopeService $teacherScopeService,
        private readonly TeacherScheduleService $teacherScheduleService,
        private readonly TeacherSchedulePdfService $teacherSchedulePdfService,
        private readonly LeaveService $leaveService,
    ) {}

    public function groups(Request $request): AnonymousResourceCollection
    {
        return ClassOfferingResource::collection(
            $this->teacherScopeService->ownedClassOfferings($request->user()),
        );
    }

    public function teachingSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'view' => ['sometimes', 'string', 'in:day,week,month'],
            'date' => ['sometimes', 'date'],
        ]);

        $payload = $this->teacherScheduleService->scheduleForTeacher(
            $request->user(),
            $validated['view'] ?? 'week',
            $validated['date'] ?? now()->toDateString(),
        );

        return response()->json($payload);
    }

    public function teachingSchedulePdf(Request $request): Response
    {
        $validated = $request->validate([
            'view' => ['sometimes', 'string', 'in:day,week,month'],
            'date' => ['sometimes', 'date'],
            'preview' => ['sometimes', 'boolean'],
        ]);

        $pdf = $this->teacherSchedulePdfService->generate(
            $request->user(),
            $validated['view'] ?? 'week',
            $validated['date'] ?? now()->toDateString(),
        );

        $disposition = ($validated['preview'] ?? false) ? 'inline' : 'attachment';

        return response($pdf['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$pdf['filename'].'"',
        ]);
    }

    public function students(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $offeringIds = $this->teacherScopeService->teacherClassOfferingIds($user);

        $students = Student::query()
            ->whereHas('enrollments', function ($q) use ($offeringIds) {
                $q->where('status', EnrollmentStatus::Active)
                    ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0]);
            })
            ->with([
                'currentGrade.educationalStage',
                'enrollments' => function ($q) use ($offeringIds) {
                    $q->where('status', EnrollmentStatus::Active)
                        ->whereIn('class_offering_id', $offeringIds !== [] ? $offeringIds : [0])
                        ->with(['classOffering.subject', 'classOffering.grade']);
                },
            ])
            ->orderBy('full_name')
            ->distinct()
            ->get();

        return StudentResource::collection($students);
    }

    public function leaveRequests(Request $request): AnonymousResourceCollection
    {
        $request->merge(['filter' => array_merge($request->input('filter', []), [
            'user_id' => $request->user()->id,
        ])]);

        return LeaveRequestResource::collection(
            $this->leaveService->listRequests($request),
        );
    }

    public function evaluations(Request $request): AnonymousResourceCollection
    {
        return EvaluationResource::collection(
            Evaluation::query()
                ->where('created_by', $request->user()->id)
                ->with(['classOffering.subject', 'classOffering.grade', 'student', 'creator'])
                ->latest()
                ->paginate($request->integer('per_page', 50))
                ->appends($request->query()),
        );
    }

    public function leaveBalances(Request $request): AnonymousResourceCollection
    {
        return LeaveBalanceResource::collection(
            $this->leaveService->balancesForUser(
                $request->user(),
                $request->filled('year') ? (int) $request->integer('year') : null,
            ),
        );
    }
}
