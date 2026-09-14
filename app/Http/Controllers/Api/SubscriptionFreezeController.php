<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\EndSubscriptionFreezeRequest;
use App\Http\Requests\Subscription\StoreSubscriptionFreezeRequest;
use App\Http\Resources\SubscriptionFreezeResource;
use App\Models\StudentPlanSubscription;
use App\Models\SubscriptionFreeze;
use App\Services\FreezeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class SubscriptionFreezeController extends Controller
{
    public function __construct(
        private readonly FreezeService $freezeService,
    ) {}

    public function index(StudentPlanSubscription $subscription): AnonymousResourceCollection
    {
        return SubscriptionFreezeResource::collection(
            $this->freezeService->listForSubscription($subscription),
        );
    }

    public function store(StoreSubscriptionFreezeRequest $request, StudentPlanSubscription $subscription): JsonResponse
    {
        $validated = $request->validated();

        $freeze = $this->freezeService->createFreeze(
            subscription: $subscription,
            startDate: Carbon::parse($validated['start_date']),
            endDate: isset($validated['end_date']) ? Carbon::parse($validated['end_date']) : null,
            reason: $validated['reason'],
            pausesInstallments: (bool) ($validated['pauses_installments'] ?? false),
            pausesAttendance: (bool) ($validated['pauses_attendance_expectation'] ?? false),
            extendsSubscription: (bool) ($validated['extends_subscription'] ?? false),
            createdBy: $request->user(),
        );

        return (new SubscriptionFreezeResource($freeze))
            ->response()
            ->setStatusCode(201);
    }

    public function end(EndSubscriptionFreezeRequest $request, SubscriptionFreeze $freeze): SubscriptionFreezeResource
    {
        $actualEndDate = isset($request->validated()['actual_end_date'])
            ? Carbon::parse($request->validated()['actual_end_date'])
            : null;

        return new SubscriptionFreezeResource(
            $this->freezeService->endFreeze($freeze, $actualEndDate),
        );
    }
}
