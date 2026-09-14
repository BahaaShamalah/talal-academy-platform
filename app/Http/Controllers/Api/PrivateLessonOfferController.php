<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\StorePrivateLessonOfferRequest;
use App\Http\Requests\PrivateLesson\UpdatePrivateLessonOfferRequest;
use App\Http\Resources\PrivateLessonOfferResource;
use App\Models\PrivateLessonOffer;
use App\Services\PrivateLessonOfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrivateLessonOfferController extends Controller
{
    public function __construct(
        private readonly PrivateLessonOfferService $offerService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PrivateLessonOfferResource::collection($this->offerService->list($request));
    }

    public function store(StorePrivateLessonOfferRequest $request): JsonResponse
    {
        $offer = $this->offerService->create($request->validated());

        return (new PrivateLessonOfferResource($offer))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PrivateLessonOffer $privateLessonOffer): PrivateLessonOfferResource
    {
        return new PrivateLessonOfferResource(
            $privateLessonOffer->load(['grade', 'subject', 'teacher', 'slots', 'imageMedia'])
        );
    }

    public function update(UpdatePrivateLessonOfferRequest $request, PrivateLessonOffer $privateLessonOffer): PrivateLessonOfferResource
    {
        return new PrivateLessonOfferResource(
            $this->offerService->update($privateLessonOffer, $request->validated())
        );
    }

    public function destroy(PrivateLessonOffer $privateLessonOffer): JsonResponse
    {
        $this->offerService->delete($privateLessonOffer);

        return response()->json(['message' => 'Private lesson offer deleted successfully.']);
    }
}
