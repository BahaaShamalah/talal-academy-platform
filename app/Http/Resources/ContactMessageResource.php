<?php

namespace App\Http\Resources;

use App\Models\ContactMessage;
use App\Support\KuwaitPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ContactMessage */
class ContactMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'phone_secondary' => $this->phone_secondary,
            'whatsapp' => KuwaitPhone::whatsapp($this->phone),
            'whatsapp_secondary' => $this->phone_secondary ? KuwaitPhone::whatsapp($this->phone_secondary) : null,
            'educational_stage_id' => $this->educational_stage_id,
            'message' => $this->message,
            'status' => $this->status?->value,
            'admin_notes' => $this->admin_notes,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at,
            'educational_stage' => $this->whenLoaded('educationalStage', fn () => $this->educationalStage ? [
                'id' => $this->educationalStage->id,
                'name' => $this->educationalStage->name,
            ] : null),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
