<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\ConfirmPrivateLessonBookingRequest;
use App\Http\Resources\PrivateLessonBookingResource;
use App\Models\PrivateLessonBooking;
use App\Models\PrivateLessonSlot;
use App\Services\PrivateLessonBookingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrivateLessonBookingController extends Controller
{
    public function __construct(
        private readonly PrivateLessonBookingService $bookingService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PrivateLessonBookingResource::collection(
            $this->bookingService->listAll($request)
        );
    }

    public function confirm(ConfirmPrivateLessonBookingRequest $request, PrivateLessonBooking $booking): PrivateLessonBookingResource
    {
        $slotId = $request->validated('private_lesson_slot_id');
        $slot = $slotId ? PrivateLessonSlot::query()->findOrFail($slotId) : null;

        $confirmed = $this->bookingService->confirm(
            $booking,
            $slot,
            $request->user(),
        );

        return new PrivateLessonBookingResource($confirmed);
    }
}
