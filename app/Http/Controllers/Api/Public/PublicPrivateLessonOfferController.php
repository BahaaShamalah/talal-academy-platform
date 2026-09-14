<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\PrivateLessonOfferStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PrivateLessonOfferResource;
use App\Http\Resources\PrivateLessonSlotResource;
use App\Models\PrivateLessonOffer;
use App\Services\PrivateLessonOfferService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicPrivateLessonOfferController extends Controller
{
    public function __construct(
        private readonly PrivateLessonOfferService $offerService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PrivateLessonOfferResource::collection(
            $this->offerService->list($request, activeOnly: true)
        );
    }

    public function slots(Request $request, PrivateLessonOffer $offer): AnonymousResourceCollection
    {
        abort_if($offer->status !== PrivateLessonOfferStatus::Active, 404);

        $paginated = $offer->slots()
            ->orderBy('specific_date')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());

        $paginated->getCollection()->transform(function ($slot) {
            $occupied = $slot->bookings()
                ->whereNotIn('status', ['cancelled'])
                ->count();
            $slot->available_spots = max(0, (int) $slot->capacity - $occupied);

            return $slot;
        });

        return PrivateLessonSlotResource::collection($paginated);
    }
}
