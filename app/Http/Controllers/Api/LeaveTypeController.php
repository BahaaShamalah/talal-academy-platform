<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeaveType\StoreLeaveTypeRequest;
use App\Http\Requests\LeaveType\UpdateLeaveTypeRequest;
use App\Http\Resources\LeaveTypeResource;
use App\Models\LeaveType;
use App\Services\LeaveTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeaveTypeController extends Controller
{
    public function __construct(
        private readonly LeaveTypeService $leaveTypeService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return LeaveTypeResource::collection($this->leaveTypeService->list($request));
    }

    public function store(StoreLeaveTypeRequest $request): JsonResponse
    {
        $leaveType = $this->leaveTypeService->create($request->validated());

        return (new LeaveTypeResource($leaveType))
            ->response()
            ->setStatusCode(201);
    }

    public function show(LeaveType $leaveType): LeaveTypeResource
    {
        return new LeaveTypeResource($leaveType);
    }

    public function update(UpdateLeaveTypeRequest $request, LeaveType $leaveType): LeaveTypeResource
    {
        return new LeaveTypeResource(
            $this->leaveTypeService->update($leaveType, $request->validated()),
        );
    }

    public function destroy(LeaveType $leaveType): JsonResponse
    {
        $this->leaveTypeService->delete($leaveType);

        return response()->json(null, 204);
    }
}
