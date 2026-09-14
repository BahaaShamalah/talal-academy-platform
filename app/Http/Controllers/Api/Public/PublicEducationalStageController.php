<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\EducationalStageResource;
use App\Models\EducationalStage;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicEducationalStageController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $stages = EducationalStage::query()
            ->withCount('grades')
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        return EducationalStageResource::collection($stages);
    }
}
