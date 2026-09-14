<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupon\StoreCouponRequest;
use App\Http\Requests\Coupon\UpdateCouponRequest;
use App\Http\Requests\Coupon\ValidateCouponRequest;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Models\Plan;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CouponController extends Controller
{
    public function __construct(
        private readonly CouponService $couponService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return CouponResource::collection($this->couponService->list($request));
    }

    public function store(StoreCouponRequest $request): JsonResponse
    {
        $coupon = $this->couponService->create($request->validated());

        return (new CouponResource($coupon->load(['grade', 'plan'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Coupon $coupon): CouponResource
    {
        return new CouponResource($coupon->load(['grade', 'plan']));
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): CouponResource
    {
        return new CouponResource(
            $this->couponService->update($coupon, $request->validated())->load(['grade', 'plan'])
        );
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $this->couponService->delete($coupon);

        return response()->json(['message' => 'Coupon deleted successfully.']);
    }

    public function validateCode(ValidateCouponRequest $request): JsonResponse
    {
        $plan = Plan::query()->findOrFail($request->validated('plan_id'));
        $result = $this->couponService->preview($request->validated('code'), $plan);

        return response()->json($result);
    }
}
