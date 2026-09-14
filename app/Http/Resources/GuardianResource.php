<?php

namespace App\Http\Resources;

use App\Models\Guardian;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Guardian */
class GuardianResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'civil_id' => $this->civil_id,
            'phone' => $this->phone,
            'phone_secondary' => $this->phone_secondary,
            'email' => $this->email,
            'relationship' => $this->relationship?->value,
            'address' => $this->address,
            'avatar_media_id' => $this->avatar_media_id,
            'avatar_url' => $this->resolveAvatarUrl(),
            'students_count' => $this->whenCounted('students'),
            'students' => StudentResource::collection($this->whenLoaded('students')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function resolveAvatarUrl(): ?string
    {
        $media = $this->relationLoaded('avatarMedia')
            ? $this->avatarMedia
            : $this->avatarMedia()->first();

        if (! $media) {
            return null;
        }

        $url = $media->url();

        return str_starts_with($url, 'http') ? $url : url($url);
    }
}
