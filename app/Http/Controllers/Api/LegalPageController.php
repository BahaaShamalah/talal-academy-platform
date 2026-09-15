<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LegalPages\UpdateLegalPageRequest;
use App\Http\Resources\LegalPageResource;
use App\Models\LegalPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LegalPageController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $pages = LegalPage::query()
            ->whereIn('page_key', LegalPage::KEYS)
            ->orderByRaw("CASE page_key WHEN 'privacy' THEN 1 WHEN 'terms' THEN 2 WHEN 'refund-policy' THEN 3 ELSE 9 END")
            ->get();

        return LegalPageResource::collection($pages);
    }

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

    public function update(UpdateLegalPageRequest $request, string $key): LegalPageResource|JsonResponse
    {
        if (! in_array($key, LegalPage::KEYS, true)) {
            return response()->json(['message' => 'الصفحة غير موجودة.'], 404);
        }

        $page = LegalPage::findByKey($key);
        if (! $page) {
            return response()->json(['message' => 'الصفحة غير موجودة.'], 404);
        }

        $page->update($request->validated());

        return new LegalPageResource($page->refresh());
    }
}
