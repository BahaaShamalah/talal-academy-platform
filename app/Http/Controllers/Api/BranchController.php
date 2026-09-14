<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Branch\StoreBranchRequest;
use App\Http\Requests\Branch\UpdateBranchRequest;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use App\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function __construct(
        private readonly BranchService $branchService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return BranchResource::collection($this->branchService->list($request));
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        $branch = $this->branchService->create($request->validated());

        return (new BranchResource($branch))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Branch $branch): BranchResource
    {
        return new BranchResource($branch->load('halls'));
    }

    public function update(UpdateBranchRequest $request, Branch $branch): BranchResource
    {
        return new BranchResource($this->branchService->update($branch, $request->validated()));
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $this->branchService->delete($branch);

        return response()->json(['message' => 'Branch deleted successfully.']);
    }
}
