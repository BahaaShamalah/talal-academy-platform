<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MarketingSection\StoreMarketingSectionRequest;
use App\Http\Requests\MarketingSection\UpdateMarketingSectionRequest;
use App\Http\Requests\MarketingSection\UploadMarketingSectionImageRequest;
use App\Http\Resources\MarketingSectionResource;
use App\Models\MarketingSection;
use App\Services\MarketingSectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MarketingSectionController extends Controller
{
    public function __construct(
        private readonly MarketingSectionService $marketingSectionService,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return MarketingSectionResource::collection($this->marketingSectionService->list());
    }

    public function store(StoreMarketingSectionRequest $request): JsonResponse
    {
        $section = $this->marketingSectionService->create($request->validated());

        return (new MarketingSectionResource($section))
            ->response()
            ->setStatusCode(201);
    }

    public function show(MarketingSection $marketingSection): MarketingSectionResource
    {
        return new MarketingSectionResource($marketingSection);
    }

    public function update(UpdateMarketingSectionRequest $request, MarketingSection $marketingSection): MarketingSectionResource
    {
        return new MarketingSectionResource(
            $this->marketingSectionService->update($marketingSection, $request->validated())
        );
    }

    public function destroy(MarketingSection $marketingSection): JsonResponse
    {
        $this->marketingSectionService->delete($marketingSection);

        return response()->json(['message' => 'تم حذف القسم.']);
    }

    public function upload(UploadMarketingSectionImageRequest $request, MarketingSection $marketingSection): MarketingSectionResource
    {
        $mediaId = $request->validated('media_id');
        if ($mediaId) {
            return new MarketingSectionResource(
                $this->marketingSectionService->attachMedia(
                    $marketingSection,
                    $request->validated('path'),
                    (int) $mediaId,
                )
            );
        }

        return new MarketingSectionResource(
            $this->marketingSectionService->upload(
                $marketingSection,
                $request->validated('path'),
                $request->file('file'),
            )
        );
    }
}
