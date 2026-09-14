<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreStudentRequest;
use App\Http\Requests\Student\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\StudentPdfService;
use App\Services\StudentService;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService,
        private readonly TeacherScopeService $teacherScopeService,
        private readonly StudentPdfService $studentPdfService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return StudentResource::collection($this->studentService->list($request, $request->user()));
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {

        $student = $this->studentService->create($request->validated());

        return (new StudentResource($student))

            ->response()

            ->setStatusCode(201);

    }

    public function show(Request $request, Student $student): StudentResource
    {
        $this->teacherScopeService->assertStudentInRoster($request->user(), $student->id);

        return new StudentResource(
            $student->load(['guardian', 'currentGrade.educationalStage', 'enrollments'])->loadCount('enrollments')
        );
    }

    public function update(UpdateStudentRequest $request, Student $student): StudentResource
    {

        return new StudentResource($this->studentService->update($student, $request->validated()));

    }

    public function destroy(Student $student): JsonResponse
    {
        $this->studentService->delete($student);

        return response()->json(['message' => 'Student deleted successfully.']);
    }

    public function pdf(Request $request, Student $student): Response
    {
        $this->teacherScopeService->assertStudentInRoster($request->user(), $student->id);

        $result = $this->studentPdfService->generate($student);
        $disposition = $request->boolean('preview') ? 'inline' : 'attachment';

        return response($result['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$result['filename'].'"',
            'Content-Length' => (string) strlen($result['content']),
        ]);
    }

    public function html(Request $request, Student $student): Response
    {
        $this->teacherScopeService->assertStudentInRoster($request->user(), $student->id);

        $html = $this->studentPdfService->renderHtml($student, forBrowser: true);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
}
