<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExamResultResource;
use App\Models\Student;
use App\Services\ExamService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class GuardianExamResultController extends Controller
{
    public function __construct(
        private readonly ExamService $examService,
    ) {}

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        return ExamResultResource::collection(
            $this->examService
                ->listForStudent($student, $request)
                ->loadMissing(['exam.classOffering.subject', 'exam.period']),
        );
    }
}
