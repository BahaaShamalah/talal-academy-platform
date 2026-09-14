<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StaffAttendance\StaffAttendanceSummaryRequest;
use App\Http\Requests\StaffAttendance\StoreStaffAttendanceRequest;
use App\Http\Requests\StaffAttendance\UpdateStaffAttendanceRequest;
use App\Http\Resources\StaffAttendanceRecordResource;
use App\Models\StaffAttendanceRecord;
use App\Services\StaffAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StaffAttendanceController extends Controller
{
    public function __construct(
        private readonly StaffAttendanceService $staffAttendanceService,
    ) {}

    public function checkIn(Request $request): JsonResponse
    {
        $record = $this->staffAttendanceService->checkIn($request->user());

        return (new StaffAttendanceRecordResource($record))
            ->response()
            ->setStatusCode(201);
    }

    public function checkOut(Request $request): StaffAttendanceRecordResource
    {
        return new StaffAttendanceRecordResource(
            $this->staffAttendanceService->checkOut($request->user()),
        );
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return StaffAttendanceRecordResource::collection(
            $this->staffAttendanceService->list($request),
        );
    }

    public function summary(StaffAttendanceSummaryRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->staffAttendanceService->summary(
                (int) $request->validated('user_id'),
                $request->validated('month'),
            ),
        ]);
    }

    public function store(StoreStaffAttendanceRequest $request): JsonResponse
    {
        $record = $this->staffAttendanceService->create(
            $request->validated(),
            $request->user(),
        );

        return (new StaffAttendanceRecordResource($record))
            ->response()
            ->setStatusCode(201);
    }

    public function show(StaffAttendanceRecord $staffAttendanceRecord): StaffAttendanceRecordResource
    {
        return new StaffAttendanceRecordResource(
            $staffAttendanceRecord->load(['user', 'marker']),
        );
    }

    public function update(
        UpdateStaffAttendanceRequest $request,
        StaffAttendanceRecord $staffAttendanceRecord,
    ): StaffAttendanceRecordResource {
        return new StaffAttendanceRecordResource(
            $this->staffAttendanceService->update(
                $staffAttendanceRecord,
                $request->validated(),
                $request->user(),
            ),
        );
    }

    public function destroy(StaffAttendanceRecord $staffAttendanceRecord): JsonResponse
    {
        $this->staffAttendanceService->delete($staffAttendanceRecord);

        return response()->json(null, 204);
    }
}
