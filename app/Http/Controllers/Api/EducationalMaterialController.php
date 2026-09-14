<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EducationalMaterial\StoreEducationalMaterialRequest;
use App\Http\Resources\EducationalMaterialResource;
use App\Models\EducationalMaterial;
use App\Services\EducationalMaterialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EducationalMaterialController extends Controller
{
    public function __construct(
        private readonly EducationalMaterialService $educationalMaterialService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return EducationalMaterialResource::collection(
            $this->educationalMaterialService
                ->list($request, $request->user())
                ->loadMissing(['media', 'grade', 'subject', 'student', 'period', 'uploader']),
        );
    }

    public function store(StoreEducationalMaterialRequest $request): JsonResponse
    {
        $material = $this->educationalMaterialService->create(
            $request->validated(),
            $request->user(),
        );

        return (new EducationalMaterialResource($material->load(['media', 'grade', 'subject', 'student', 'period', 'uploader'])))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(EducationalMaterial $material): JsonResponse
    {
        $this->educationalMaterialService->delete($material);

        return response()->json(null, 204);
    }
}
