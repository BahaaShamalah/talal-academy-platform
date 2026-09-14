<?php

namespace App\Http\Resources;

use App\Models\StaffProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StaffProfile */
class StaffProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'civil_id' => $this->civil_id,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'nationality' => $this->nationality,
            'address' => $this->address,
            'job_title' => $this->job_title,
            'specialization' => $this->specialization,
            'contract_start_date' => $this->contract_start_date?->toDateString(),
            'contract_end_date' => $this->contract_end_date?->toDateString(),
            'contract_type' => $this->contract_type?->value,
            'notes' => $this->notes,
            'expected_start_time' => $this->formatTime($this->expected_start_time),
            'expected_end_time' => $this->formatTime($this->expected_end_time),
            'qualifications' => [
                'subjects' => $this->whenLoaded('subjects', fn () => $this->subjects->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                ])->values()),
                'grades' => $this->whenLoaded('grades', fn () => $this->grades->map(fn ($g) => [
                    'id' => $g->id,
                    'name' => $g->name,
                ])->values()),
            ],
            'documents' => StaffDocumentResource::collection($this->whenLoaded('documents')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        return substr((string) $time, 0, 8);
    }
}
