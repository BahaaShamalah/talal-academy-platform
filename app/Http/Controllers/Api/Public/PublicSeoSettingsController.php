<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\InstituteSetting;
use Illuminate\Http\JsonResponse;

class PublicSeoSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = InstituteSetting::current()->load(['faviconMedia', 'ogImageMedia']);

        return response()->json([
            'seo_title' => $settings->seo_title,
            'seo_description' => $settings->seo_description,
            'favicon_url' => $this->absoluteMediaUrl($settings->faviconMedia?->url()),
            'og_image_url' => $this->absoluteMediaUrl($settings->ogImageMedia?->url()),
            'google_analytics_id' => $settings->google_analytics_id,
            'google_search_console_verification' => $settings->google_search_console_verification,
        ]);
    }

    private function absoluteMediaUrl(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        return str_starts_with($url, 'http') ? $url : url($url);
    }
}
