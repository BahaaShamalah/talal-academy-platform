<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\AddSubjectRequest;
use App\Http\Requests\Subscription\ChangePlanRequest;
use App\Http\Requests\Subscription\RemoveSubjectRequest;
use App\Http\Resources\SubscriptionChangeResource;
use App\Models\Plan;
use App\Models\StudentPlanSubscription;
use App\Services\SubscriptionChangeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubscriptionChangeController extends Controller
{
    public function __construct(
        private readonly SubscriptionChangeService $subscriptionChangeService,
    ) {}

    public function index(StudentPlanSubscription $subscription): AnonymousResourceCollection
    {
        return SubscriptionChangeResource::collection(
            $this->subscriptionChangeService->listForSubscription($subscription),
        );
    }

    public function changePlan(ChangePlanRequest $request, StudentPlanSubscription $subscription): JsonResponse
    {
        $newPlan = Plan::query()->findOrFail($request->validated('new_plan_id'));

        $change = $this->subscriptionChangeService->changePlan(
            $subscription,
            $newPlan,
            $request->validated('manual_amount_override') !== null
                ? (float) $request->validated('manual_amount_override')
                : null,
            $request->validated('reason'),
            $request->user(),
        );

        return (new SubscriptionChangeResource($change))
            ->response()
            ->setStatusCode(201);
    }

    public function addSubject(AddSubjectRequest $request, StudentPlanSubscription $subscription): JsonResponse
    {
        $change = $this->subscriptionChangeService->addSubject(
            $subscription,
            (int) $request->validated('subject_id'),
            $request->validated('manual_amount_override') !== null
                ? (float) $request->validated('manual_amount_override')
                : null,
            $request->validated('reason'),
            $request->user(),
        );

        return (new SubscriptionChangeResource($change))
            ->response()
            ->setStatusCode(201);
    }

    public function removeSubject(RemoveSubjectRequest $request, StudentPlanSubscription $subscription): JsonResponse
    {
        $change = $this->subscriptionChangeService->removeSubject(
            $subscription,
            (int) $request->validated('subject_id'),
            $request->validated('manual_amount_override') !== null
                ? (float) $request->validated('manual_amount_override')
                : null,
            $request->validated('reason'),
            $request->user(),
        );

        return (new SubscriptionChangeResource($change))
            ->response()
            ->setStatusCode(201);
    }
}
