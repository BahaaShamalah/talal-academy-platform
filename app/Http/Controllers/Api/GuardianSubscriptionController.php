<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupon\ValidateCouponRequest;
use App\Http\Requests\Subscription\SubscribeStudentRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Plan;
use App\Models\Student;
use App\Services\CouponService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GuardianSubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
        private readonly CouponService $couponService,
    ) {}

    public function store(SubscribeStudentRequest $request, Student $student): JsonResponse
    {
        Gate::forUser($request->user('guardian'))->authorize('guardian-own-student', $student);

        $plan = Plan::query()->findOrFail($request->validated('plan_id'));
        $result = $this->subscriptionService->subscribeStudentToPlan(
            $student,
            $plan,
            null,
            $request->validated('coupon_code'),
            $request->validated('selected_subject_ids'),
            $request->validated('payment_mode') ?? 'full',
            $request->boolean('apply_credit'),
        );

        return response()->json([
            'invoice' => (new InvoiceResource($result['invoice']))->resolve(),
            'subscription' => (new SubscriptionResource($result['subscription']))->resolve(),
        ], 201);
    }

    public function validateCoupon(ValidateCouponRequest $request): JsonResponse
    {
        $plan = Plan::query()->findOrFail($request->validated('plan_id'));
        $result = $this->couponService->preview($request->validated('code'), $plan);

        return response()->json($result);
    }
}
