<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\StoreGuardianPrivateLessonBookingRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\PrivateLessonBookingResource;
use App\Models\InstituteSetting;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use App\Models\Student;
use App\Services\PrivateLessonBookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class GuardianPrivateLessonBookingController extends Controller
{
    public function __construct(
        private readonly PrivateLessonBookingService $bookingService,
    ) {}

    public function store(StoreGuardianPrivateLessonBookingRequest $request): JsonResponse
    {
        $student = Student::query()->findOrFail($request->validated('student_id'));
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $offer = PrivateLessonOffer::query()->findOrFail($request->validated('private_lesson_offer_id'));
        $slotId = $request->validated('private_lesson_slot_id');
        $slot = $slotId ? PrivateLessonSlot::query()->findOrFail($slotId) : null;

        $preferredPeriod = null;
        $periodId = $request->validated('preferred_period_id');
        if ($periodId) {
            $periods = InstituteSetting::current()->activePrivateLessonPeriods();
            $match = collect($periods)->firstWhere('id', $periodId);
            if (! $match) {
                throw ValidationException::withMessages([
                    'preferred_period_id' => ['الفترة المختارة غير متاحة.'],
                ]);
            }
            $preferredPeriod = $match;
        } elseif ($request->filled('preferred_period_name')) {
            $preferredPeriod = [
                'name_ar' => $request->validated('preferred_period_name'),
                'start_time' => $request->validated('preferred_start_time'),
                'end_time' => $request->validated('preferred_end_time'),
            ];
        }

        $result = $this->bookingService->createForGuardian(
            $student,
            $offer,
            $slot,
            null,
            $preferredPeriod,
        );

        $payload = [
            'booking' => (new PrivateLessonBookingResource($result['booking']))->resolve(),
        ];

        if ($result['invoice'] !== null) {
            $payload['invoice'] = (new InvoiceResource($result['invoice']))->resolve();
        }

        if ($result['institute_phone'] !== null) {
            $payload['institute_phone'] = $result['institute_phone'];
        }

        return response()->json($payload, 201);
    }

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        return PrivateLessonBookingResource::collection(
            $this->bookingService->listForStudent($student, $request)
        );
    }
}
