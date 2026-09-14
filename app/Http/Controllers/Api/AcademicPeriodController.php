<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcademicPeriod\StoreAcademicPeriodRequest;
use App\Http\Requests\AcademicPeriod\TransitionAcademicPeriodRequest;
use App\Http\Requests\AcademicPeriod\UpdateAcademicPeriodRequest;
use App\Http\Resources\AcademicPeriodResource;
use App\Models\AcademicPeriod;
use App\Services\AcademicPeriodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AcademicPeriodController extends Controller
{
    public function __construct(
        private readonly AcademicPeriodService $academicPeriodService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return AcademicPeriodResource::collection($this->academicPeriodService->list($request));
    }

    public function store(StoreAcademicPeriodRequest $request): JsonResponse
    {
        $period = $this->academicPeriodService->create($request->validated());

        return (new AcademicPeriodResource($period))
            ->response()
            ->setStatusCode(201);
    }

    public function show(AcademicPeriod $period): AcademicPeriodResource
    {
        return new AcademicPeriodResource($period);
    }

    public function update(UpdateAcademicPeriodRequest $request, AcademicPeriod $period): AcademicPeriodResource
    {
        return new AcademicPeriodResource(
            $this->academicPeriodService->update($period, $request->validated())
        );
    }

    public function destroy(AcademicPeriod $period): JsonResponse
    {
        $this->academicPeriodService->delete($period);

        return response()->json(['message' => 'تم حذف الفترة الدراسية بنجاح.']);
    }

    public function activate(AcademicPeriod $period): AcademicPeriodResource
    {
        return new AcademicPeriodResource($this->academicPeriodService->activate($period));
    }

    public function transition(TransitionAcademicPeriodRequest $request, AcademicPeriod $period): AcademicPeriodResource
    {
        return new AcademicPeriodResource(
            $this->academicPeriodService->transitionTo($period, $request->validated('status'))
        );
    }
}
