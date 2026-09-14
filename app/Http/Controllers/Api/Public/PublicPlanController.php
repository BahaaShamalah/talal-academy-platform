<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class PublicPlanController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $plans = QueryBuilder::for(Plan::class)
            ->where('is_active', true)
            ->allowedFilters(
                AllowedFilter::callback('grade_id', function ($query, $value) {
                    $gradeId = (int) $value;
                    $query->where(function ($q) use ($gradeId) {
                        $q->where('grade_id', $gradeId)
                            ->orWhereHas(
                                'educationalStage.grades',
                                fn ($gq) => $gq->where('grades.id', $gradeId),
                            );
                    });
                }),
                AllowedFilter::exact('educational_stage_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('educationalStage'),
                AllowedInclude::relationship('subject'),
                AllowedInclude::relationship('durationPeriod'),
                AllowedInclude::relationship('installmentTemplate'),
                AllowedInclude::relationship('productType'),
            )
            ->with(['installmentTemplate', 'productType', 'educationalStage', 'grade'])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());

        return PlanResource::collection($plans);
    }
}
