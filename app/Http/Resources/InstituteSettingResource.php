<?php

namespace App\Http\Resources;

use App\Models\InstituteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InstituteSetting */
class InstituteSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['logoMedia', 'stampMedia', 'faviconMedia', 'ogImageMedia']);

        return [
            'id' => $this->id,
            'institute_name_ar' => $this->institute_name_ar,
            'institute_name_en' => $this->institute_name_en,
            'logo_media_id' => $this->logo_media_id,
            'logo_url' => $this->logoMedia?->url(),
            'stamp_media_id' => $this->stamp_media_id,
            'stamp_url' => $this->stampMedia?->url(),
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'commercial_registration_number' => $this->commercial_registration_number,
            'invoice_footer_note' => $this->invoice_footer_note,
            'director_name' => $this->director_name,
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'favicon_media_id' => $this->favicon_media_id,
            'favicon_url' => $this->faviconMedia?->url(),
            'og_image_media_id' => $this->og_image_media_id,
            'og_image_url' => $this->ogImageMedia?->url(),
            'google_analytics_id' => $this->google_analytics_id,
            'google_search_console_verification' => $this->google_search_console_verification,
            'private_lesson_periods' => is_array($this->private_lesson_periods) && $this->private_lesson_periods !== []
                ? $this->private_lesson_periods
                : InstituteSetting::defaultPrivateLessonPeriods(),
            'updated_at' => $this->updated_at,
        ];
    }
}
