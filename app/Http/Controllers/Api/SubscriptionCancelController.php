<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\CancelSubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\StudentPlanSubscription;
use App\Services\SubscriptionService;

class SubscriptionCancelController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {}

    public function store(CancelSubscriptionRequest $request, StudentPlanSubscription $subscription): SubscriptionResource
    {
        return new SubscriptionResource(
            $this->subscriptionService->cancelSubscription(
                $subscription,
                $request->validated('reason'),
            )->load(['plan', 'invoice'])
        );
    }
}
