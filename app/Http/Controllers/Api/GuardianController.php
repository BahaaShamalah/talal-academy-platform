<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guardian\StoreGuardianRequest;
use App\Http\Requests\Guardian\UpdateGuardianRequest;
use App\Http\Resources\GuardianResource;
use App\Models\Guardian;
use App\Services\GuardianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GuardianController extends Controller
{
    public function __construct(
        private readonly GuardianService $guardianService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return GuardianResource::collection($this->guardianService->list($request));
    }

    public function store(StoreGuardianRequest $request): JsonResponse
    {
        $guardian = $this->guardianService->create($request->validated());

        return (new GuardianResource($guardian))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Guardian $guardian): GuardianResource
    {
        return new GuardianResource($guardian->loadCount('students'));
    }

    public function update(UpdateGuardianRequest $request, Guardian $guardian): GuardianResource
    {
        return new GuardianResource(
            $this->guardianService->update($guardian, $request->validated())->loadCount('students')
        );
    }

    public function destroy(Guardian $guardian): JsonResponse
    {
        $this->guardianService->delete($guardian);

        return response()->json(['message' => 'Guardian deleted successfully.']);
    }
}
