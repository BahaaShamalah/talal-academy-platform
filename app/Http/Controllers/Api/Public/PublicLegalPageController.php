<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\LegalPageResource;
use App\Models\LegalPage;
use Illuminate\Http\JsonResponse;

class PublicLegalPageController extends Controller
{
    public function show(string $key): LegalPageResource|JsonResponse
    {
        if (! in_array($key, LegalPage::KEYS, true)) {
            return response()->json(['message' => 'الصفحة غير موجودة.'], 404);
        }

        $page = LegalPage::findByKey($key);
        if (! $page) {
            return response()->json(['message' => 'الصفحة غير موجودة.'], 404);
        }

        return new LegalPageResource($page);
    }
}
