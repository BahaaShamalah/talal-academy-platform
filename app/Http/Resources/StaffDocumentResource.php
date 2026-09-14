<?php

namespace App\Http\Resources;

use App\Models\StaffDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StaffDocument */
class StaffDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'staff_profile_id' => $this->staff_profile_id,
            'media_id' => $this->media_id,
            'document_type' => $this->document_type,
            'uploaded_at' => $this->uploaded_at,
            'media' => new MediaResource($this->whenLoaded('media')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
