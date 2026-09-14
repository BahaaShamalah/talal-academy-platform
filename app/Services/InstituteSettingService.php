<?php

namespace App\Services;

use App\Models\InstituteSetting;
use Illuminate\Http\UploadedFile;

class InstituteSettingService
{
    public function __construct(
        private readonly MediaService $mediaService,
    ) {}

    public function get(): InstituteSetting
    {
        return InstituteSetting::current()->load(['logoMedia', 'stampMedia', 'faviconMedia', 'ogImageMedia']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(array $data, ?UploadedFile $logo = null, ?UploadedFile $stamp = null): InstituteSetting
    {
        $settings = InstituteSetting::current();
        $oldLogoId = $settings->logo_media_id;
        $oldStampId = $settings->stamp_media_id;
        $oldFaviconId = $settings->favicon_media_id;
        $oldOgImageId = $settings->og_image_media_id;

        if (! empty($data['remove_logo'])) {
            $data['logo_media_id'] = null;
        }

        if (! empty($data['remove_stamp'])) {
            $data['stamp_media_id'] = null;
        }

        if (! empty($data['remove_favicon'])) {
            $data['favicon_media_id'] = null;
        }

        if (! empty($data['remove_og_image'])) {
            $data['og_image_media_id'] = null;
        }

        unset(
            $data['remove_logo'],
            $data['remove_stamp'],
            $data['remove_favicon'],
            $data['remove_og_image'],
            $data['logo'],
            $data['stamp'],
        );

        if ($logo) {
            $media = $this->mediaService->store($logo, 'شعار المعهد', auth()->id());
            $data['logo_media_id'] = $media->id;
        }

        if ($stamp) {
            $media = $this->mediaService->store($stamp, 'ختم المعهد', auth()->id());
            $data['stamp_media_id'] = $media->id;
        }

        // Explicit media_id from MediaPicker takes precedence when no file uploaded.
        foreach (['logo_media_id', 'stamp_media_id', 'favicon_media_id', 'og_image_media_id'] as $mediaKey) {
            if (array_key_exists($mediaKey, $data) && $data[$mediaKey] !== null) {
                $data[$mediaKey] = (int) $data[$mediaKey];
            }
        }

        $settings->update($data);
        $settings = $settings->refresh()->load(['logoMedia', 'stampMedia', 'faviconMedia', 'ogImageMedia']);

        if (array_key_exists('logo_media_id', $data) && $oldLogoId && (int) $oldLogoId !== (int) $settings->logo_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldLogoId);
        }
        if (array_key_exists('stamp_media_id', $data) && $oldStampId && (int) $oldStampId !== (int) $settings->stamp_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldStampId);
        }
        if (array_key_exists('favicon_media_id', $data) && $oldFaviconId && (int) $oldFaviconId !== (int) $settings->favicon_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldFaviconId);
        }
        if (array_key_exists('og_image_media_id', $data) && $oldOgImageId && (int) $oldOgImageId !== (int) $settings->og_image_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldOgImageId);
        }

        return $settings;
    }
}
