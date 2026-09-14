<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Compensation\StoreCompensationComponentRequest;
use App\Http\Requests\Compensation\UpdateCompensationComponentRequest;
use App\Http\Resources\StaffCompensationComponentResource;
use App\Models\StaffCompensationComponent;
use App\Models\User;
use App\Services\CompensationComponentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompensationComponentController extends Controller
{
    public function __construct(
        private readonly CompensationComponentService $compensationComponentService,
    ) {}

    public function index(User $user): AnonymousResourceCollection
    {
        return StaffCompensationComponentResource::collection(
            $this->compensationComponentService->listActive($user)
        );
    }

    public function history(User $user): AnonymousResourceCollection
    {
        return StaffCompensationComponentResource::collection(
            $this->compensationComponentService->history($user)
        );
    }

    public function store(StoreCompensationComponentRequest $request, User $user): JsonResponse
    {
        $component = $this->compensationComponentService->create($user, $request->validated());

        return (new StaffCompensationComponentResource($component))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateCompensationComponentRequest $request,
        User $user,
        StaffCompensationComponent $component,
    ): StaffCompensationComponentResource {
        $this->compensationComponentService->assertOwns($user, $component);

        return new StaffCompensationComponentResource(
            $this->compensationComponentService->update($component, $request->validated())
        );
    }

    public function destroy(User $user, StaffCompensationComponent $component): JsonResponse
    {
        $this->compensationComponentService->assertOwns($user, $component);
        $this->compensationComponentService->delete($component);

        return response()->json(['message' => 'Compensation component deleted successfully.']);
    }
}
