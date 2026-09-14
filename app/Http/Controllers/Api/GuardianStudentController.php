<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guardian\StoreStudentRequest;
use App\Http\Requests\Guardian\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\AttendanceService;
use App\Services\GuardianScheduleService;
use App\Services\StudentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class GuardianStudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService,
        private readonly GuardianScheduleService $guardianScheduleService,
        private readonly AttendanceService $attendanceService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $guardian = $request->user('guardian');
        $request->merge(['filter' => array_merge($request->input('filter', []), [
            'guardian_id' => $guardian->id,
        ])]);

        return StudentResource::collection($this->studentService->list($request));
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $guardian = $request->user('guardian');

        $student = $this->studentService->create([
            ...$request->validated(),
            'guardian_id' => $guardian->id,
        ]);

        return (new StudentResource($student))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Student $student): StudentResource
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $student->load([
            'currentGrade.educationalStage',
            'planSubscriptions.plan.subject',
            'planSubscriptions.plan.productType',
            'planSubscriptions.plan.durationPeriod',
            'planSubscriptions.invoice',
            'planSubscriptions.selectedSubjects.subject',
            'invoices.installments',
            'invoices.items',
            'enrollments.classOffering.subject',
        ])->loadCount('enrollments');

        return new StudentResource($student);
    }

    public function update(UpdateStudentRequest $request, Student $student): StudentResource
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $student = $this->studentService->update($student, $request->validated());
        $student->load([
            'currentGrade.educationalStage',
            'planSubscriptions.plan.subject',
            'planSubscriptions.plan.productType',
            'planSubscriptions.plan.durationPeriod',
            'planSubscriptions.invoice',
            'planSubscriptions.selectedSubjects.subject',
            'invoices.installments',
            'invoices.items',
            'enrollments.classOffering.subject',
        ]);

        return new StudentResource($student);
    }

    public function schedule(Request $request, Student $student): JsonResponse
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $validated = $request->validate([
            'view' => ['sometimes', 'string', Rule::in(['day', 'week', 'month'])],
            'date' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        $payload = $this->guardianScheduleService->scheduleForStudent(
            $student,
            $validated['view'] ?? 'week',
            $validated['date'] ?? now()->toDateString(),
        );

        return response()->json($payload);
    }

    public function attendanceSummary(Request $request, Student $student): JsonResponse
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        return response()->json([
            'student_id' => $student->id,
            'summary' => $this->attendanceService->studentAttendanceSummary($student),
        ]);
    }
}
