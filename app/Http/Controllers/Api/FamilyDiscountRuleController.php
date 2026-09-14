<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FamilyDiscountRule\StoreFamilyDiscountRuleRequest;
use App\Http\Requests\FamilyDiscountRule\UpdateFamilyDiscountRuleRequest;
use App\Http\Resources\FamilyDiscountRuleResource;
use App\Models\FamilyDiscountRule;
use App\Services\FamilyDiscountRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FamilyDiscountRuleController extends Controller
{
    public function __construct(
        private readonly FamilyDiscountRuleService $familyDiscountRuleService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FamilyDiscountRuleResource::collection(
            $this->familyDiscountRuleService->list($request)
        );
    }

    public function store(StoreFamilyDiscountRuleRequest $request): JsonResponse
    {
        $rule = $this->familyDiscountRuleService->create($request->validated());

        return (new FamilyDiscountRuleResource($rule))
            ->response()
            ->setStatusCode(201);
    }

    public function show(FamilyDiscountRule $familyDiscountRule): FamilyDiscountRuleResource
    {
        return new FamilyDiscountRuleResource($familyDiscountRule);
    }

    public function update(
        UpdateFamilyDiscountRuleRequest $request,
        FamilyDiscountRule $familyDiscountRule,
    ): FamilyDiscountRuleResource {
        return new FamilyDiscountRuleResource(
            $this->familyDiscountRuleService->update($familyDiscountRule, $request->validated())
        );
    }

    public function destroy(FamilyDiscountRule $familyDiscountRule): JsonResponse
    {
        $this->familyDiscountRuleService->delete($familyDiscountRule);

        return response()->json(['message' => 'Family discount rule deleted successfully.']);
    }
}
