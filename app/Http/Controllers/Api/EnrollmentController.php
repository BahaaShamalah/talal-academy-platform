<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Enrollment\StoreEnrollmentRequest;
use App\Http\Requests\Enrollment\SyncStudentEnrollmentsRequest;
use App\Http\Requests\Enrollment\UpdateEnrollmentRequest;
use App\Http\Requests\Enrollment\UpdateEnrollmentStatusRequest;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\StudentResource;
use App\Models\Enrollment;
use App\Models\Student;
use App\Services\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnrollmentController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return EnrollmentResource::collection($this->enrollmentService->list($request));
    }

    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        $enrollment = $this->enrollmentService->create(
            $request->validated(),
            $request->user()->id,
        );

        return (new EnrollmentResource($enrollment->load([
            'student',
            'classOffering.subject',
            'classOffering.grade',
        ])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Enrollment $enrollment): EnrollmentResource
    {
        return new EnrollmentResource($enrollment->load([
            'student',
            'classOffering.subject',
            'classOffering.grade',
        ]));
    }

    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment): EnrollmentResource
    {
        return new EnrollmentResource(
            $this->enrollmentService
                ->update($enrollment, $request->validated())
                ->load(['student', 'classOffering.subject', 'classOffering.grade'])
        );
    }

    public function updateStatus(UpdateEnrollmentStatusRequest $request, Enrollment $enrollment): EnrollmentResource
    {
        return new EnrollmentResource(
            $this->enrollmentService
                ->updateStatus($enrollment, $request->validated())
                ->load(['student', 'classOffering.subject', 'classOffering.grade'])
        );
    }

    public function syncForStudent(SyncStudentEnrollmentsRequest $request, Student $student): StudentResource
    {
        $this->enrollmentService->syncForStudent(
            $student,
            $request->validated('assignments'),
            $request->user()->id,
        );

        return new StudentResource(
            $student->fresh([
                'guardian',
                'currentGrade.educationalStage',
                'enrollments.classOffering.subject',
                'enrollments.classOffering.grade',
            ])->loadCount('enrollments')
        );
    }

    public function destroy(Enrollment $enrollment): JsonResponse
    {
        $this->enrollmentService->delete($enrollment);

        return response()->json(['message' => 'Enrollment deleted successfully.']);
    }
}
