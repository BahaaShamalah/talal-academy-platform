<?php

namespace App\Services;

use App\Models\FamilyDiscountRule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class FamilyDiscountRuleService
{
    /**
     * @return LengthAwarePaginator<int, FamilyDiscountRule>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return FamilyDiscountRule::query()
            ->orderBy('min_children_count')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): FamilyDiscountRule
    {
        return FamilyDiscountRule::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(FamilyDiscountRule $rule, array $data): FamilyDiscountRule
    {
        $rule->update($data);

        return $rule->refresh();
    }

    public function delete(FamilyDiscountRule $rule): void
    {
        $rule->delete();
    }
}
