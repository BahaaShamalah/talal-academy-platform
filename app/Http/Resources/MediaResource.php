<?php

namespace App\Http\Resources;

use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Media */
class MediaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'original_filename' => $this->original_filename,
            'disk' => $this->disk,
            'path' => $this->path,
            'url' => $this->url(),
            'mime_type' => $this->mime_type,
            'width' => $this->width,
            'height' => $this->height,
            'size_bytes' => $this->size_bytes,
            'alt_text' => $this->alt_text,
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at,
        ];
    }
}
