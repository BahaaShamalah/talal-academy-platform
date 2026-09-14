<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClassOffering\BulkImportClassOfferingsRequest;
use App\Http\Requests\ClassOffering\StoreClassOfferingRequest;
use App\Http\Requests\ClassOffering\UpdateClassOfferingRequest;
use App\Http\Resources\ClassOfferingResource;
use App\Models\ClassOffering;
use App\Services\ClassOfferingBulkImportService;
use App\Services\ClassOfferingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassOfferingController extends Controller
{
    public function __construct(
        private readonly ClassOfferingService $classOfferingService,
        private readonly ClassOfferingBulkImportService $bulkImportService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ClassOfferingResource::collection(
            $this->classOfferingService->list($request->query(), $request->user())
        );
    }

    public function show(ClassOffering $classOffering): ClassOfferingResource
    {
        return new ClassOfferingResource(
            $classOffering->load(['grade', 'gradeSection', 'subject', 'teacher', 'hall', 'period', 'schedules'])
                ->loadCount([
                    'enrollments as active_students_count' => fn ($q) => $q->whereIn('status', [
                        \App\Enums\EnrollmentStatus::Active,
                        \App\Enums\EnrollmentStatus::PendingPayment,
                    ]),
                ])
        );
    }

    public function bulkImport(BulkImportClassOfferingsRequest $request): JsonResponse
    {
        $results = $this->bulkImportService->import(
            $request->validated('rows'),
            $request->boolean('force_all'),
        );

        $succeeded = collect($results)->where('success', true)->count();
        $failed = count($results) - $succeeded;

        return response()->json([
            'results' => $results,
            'summary' => [
                'total' => count($results),
                'succeeded' => $succeeded,
                'failed' => $failed,
            ],
        ]);
    }

    public function store(StoreClassOfferingRequest $request): JsonResponse
    {
        $offering = $this->classOfferingService->create($request->validated());

        return (new ClassOfferingResource(
            $offering->load(['grade', 'gradeSection', 'subject', 'teacher', 'hall', 'period', 'schedules'])
        ))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateClassOfferingRequest $request, ClassOffering $classOffering): ClassOfferingResource
    {
        return new ClassOfferingResource(
            $this->classOfferingService
                ->update($classOffering, $request->validated())
                ->load(['grade', 'gradeSection', 'subject', 'teacher', 'hall', 'period', 'schedules'])
        );
    }

    public function destroy(ClassOffering $classOffering): JsonResponse
    {
        $this->classOfferingService->delete($classOffering);

        return response()->json(['message' => 'Class offering deleted successfully.']);
    }
}
