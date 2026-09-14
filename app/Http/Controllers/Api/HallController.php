<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hall\StoreHallRequest;
use App\Http\Requests\Hall\UpdateHallRequest;
use App\Http\Resources\HallResource;
use App\Models\Hall;
use App\Services\HallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HallController extends Controller
{
    public function __construct(
        private readonly HallService $hallService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return HallResource::collection($this->hallService->list($request));
    }

    public function store(StoreHallRequest $request): JsonResponse
    {
        $hall = $this->hallService->create($request->validated());

        return (new HallResource($hall->load('branch')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Hall $hall): HallResource
    {
        return new HallResource($hall->load('branch'));
    }

    public function update(UpdateHallRequest $request, Hall $hall): HallResource
    {
        return new HallResource(
            $this->hallService->update($hall, $request->validated())->load('branch')
        );
    }

    public function destroy(Hall $hall): JsonResponse
    {
        $this->hallService->delete($hall);

        return response()->json(['message' => 'Hall deleted successfully.']);
    }
}
