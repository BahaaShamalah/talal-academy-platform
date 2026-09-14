<?php

namespace App\Http\Resources;

use App\Models\AbsenceAlertThreshold;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AbsenceAlertThreshold */
class AbsenceAlertThresholdResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'consecutive_absences_count' => $this->consecutive_absences_count,
            'alert_level' => $this->alert_level?->value,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
