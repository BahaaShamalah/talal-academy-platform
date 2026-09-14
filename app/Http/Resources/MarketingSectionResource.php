<?php

namespace App\Http\Resources;

use App\Models\MarketingSection;
use App\Services\MarketingSectionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MarketingSection */
class MarketingSectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $content = is_array($this->content) ? $this->content : [];
        /** @var MarketingSectionService $resolver */
        $resolver = app(MarketingSectionService::class);

        // Public: resolve media IDs → URLs. Admin (authenticated): keep IDs so saves don't overwrite them.
        $resolved = $request->user()
            ? $content
            : $resolver->resolveContentMedia($this->section_key, $content);

        return [
            'id' => $this->id,
            'section_key' => $this->section_key,
            'content' => $resolved,
            'is_active' => $this->is_active,
            'display_order' => $this->display_order,
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
