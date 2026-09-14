<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\SubscribeStudentRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Plan;
use App\Models\Student;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StudentSubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {}

    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        return SubscriptionResource::collection(
            $this->subscriptionService->listForStudent($student, $request)
        );
    }

    public function store(SubscribeStudentRequest $request, Student $student): JsonResponse
    {
        $plan = Plan::query()->findOrFail($request->validated('plan_id'));

        $result = $this->subscriptionService->subscribeStudentToPlan(
            $student,
            $plan,
            $request->user(),
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
}
