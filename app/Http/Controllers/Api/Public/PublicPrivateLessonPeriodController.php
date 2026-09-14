<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\InstituteSetting;
use Illuminate\Http\JsonResponse;

class PublicPrivateLessonPeriodController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = InstituteSetting::current();

        return response()->json([
            'data' => $settings->activePrivateLessonPeriods(),
        ]);
    }
}
