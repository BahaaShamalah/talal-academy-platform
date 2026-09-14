<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EducationalMaterialResource;
use App\Models\Student;
use App\Services\AcademicPeriodService;
use App\Services\EducationalMaterialService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class GuardianEducationalMaterialController extends Controller
{
    public function __construct(
        private readonly EducationalMaterialService $educationalMaterialService,
        private readonly AcademicPeriodService $academicPeriodService,
    ) {}

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $periodId = $request->integer('period_id');

        if (! $periodId) {
            $period = $this->academicPeriodService->currentActive();
            if (! $period) {
                throw new UnprocessableEntityHttpException('لا يوجد فصل دراسي نشط.');
            }
            $periodId = $period->id;
        }

        $materials = $this->educationalMaterialService->getVisibleMaterials($student, $periodId);

        return EducationalMaterialResource::collection($materials);
    }
}
