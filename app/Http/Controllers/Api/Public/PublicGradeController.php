<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\GradeResource;
use App\Http\Resources\SubjectResource;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class PublicGradeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $grades = QueryBuilder::for(Grade::class)
            ->allowedFilters(AllowedFilter::exact('educational_stage_id'))
            ->allowedIncludes(AllowedInclude::relationship('educationalStage'))
            ->defaultSort('order')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());

        return GradeResource::collection($grades);
    }

    public function subjects(Grade $grade): AnonymousResourceCollection
    {
        $subjects = $grade->subjects()
            ->orderBy('name')
            ->get();

        return SubjectResource::collection($subjects);
    }
}
