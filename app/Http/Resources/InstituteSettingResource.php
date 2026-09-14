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
        $this->resource->loadMissing(['logoMedia', 'stampMedia']);

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
            'private_lesson_periods' => is_array($this->private_lesson_periods) && $this->private_lesson_periods !== []
                ? $this->private_lesson_periods
                : InstituteSetting::defaultPrivateLessonPeriods(),
            'updated_at' => $this->updated_at,
        ];
    }
}
