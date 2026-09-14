<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EvaluationResource;
use App\Models\Student;
use App\Services\EvaluationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class GuardianEvaluationController extends Controller
{
    public function __construct(
        private readonly EvaluationService $evaluationService,
    ) {}

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        return EvaluationResource::collection(
            $this->evaluationService
                ->listForStudent($student, $request)
                ->loadMissing(['classOffering.subject', 'creator']),
        );
    }
}
