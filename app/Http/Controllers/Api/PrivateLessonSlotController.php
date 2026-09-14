<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\StorePrivateLessonSlotRequest;
use App\Http\Requests\PrivateLesson\UpdatePrivateLessonSlotRequest;
use App\Http\Resources\PrivateLessonSlotResource;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use App\Services\PrivateLessonSlotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrivateLessonSlotController extends Controller
{
    public function __construct(
        private readonly PrivateLessonSlotService $slotService,
    ) {}

    public function index(Request $request, PrivateLessonOffer $privateLessonOffer): AnonymousResourceCollection
    {
        return PrivateLessonSlotResource::collection(
            $this->slotService->listForOffer($privateLessonOffer, $request)
        );
    }

    public function store(StorePrivateLessonSlotRequest $request, PrivateLessonOffer $privateLessonOffer): JsonResponse
    {
        $slot = $this->slotService->create($privateLessonOffer, $request->validated());

        return (new PrivateLessonSlotResource($slot))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PrivateLessonOffer $privateLessonOffer, PrivateLessonSlot $slot): PrivateLessonSlotResource
    {
        abort_if((int) $slot->private_lesson_offer_id !== (int) $privateLessonOffer->id, 404);

        return new PrivateLessonSlotResource($slot);
    }

    public function update(
        UpdatePrivateLessonSlotRequest $request,
        PrivateLessonOffer $privateLessonOffer,
        PrivateLessonSlot $slot,
    ): PrivateLessonSlotResource {
        abort_if((int) $slot->private_lesson_offer_id !== (int) $privateLessonOffer->id, 404);

        return new PrivateLessonSlotResource(
            $this->slotService->update($slot, $request->validated())
        );
    }

    public function destroy(PrivateLessonOffer $privateLessonOffer, PrivateLessonSlot $slot): JsonResponse
    {
        abort_if((int) $slot->private_lesson_offer_id !== (int) $privateLessonOffer->id, 404);

        $this->slotService->delete($slot);

        return response()->json(['message' => 'Private lesson slot deleted successfully.']);
    }
}
