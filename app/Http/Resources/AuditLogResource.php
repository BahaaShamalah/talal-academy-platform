<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\AuditLog */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'description' => $this->description,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'guardian' => $this->whenLoaded('guardian', fn () => $this->guardian ? [
                'id' => $this->guardian->id,
                'name' => $this->guardian->full_name,
                'phone' => $this->guardian->phone,
            ] : null),
            'user_id' => $this->user_id,
            'guardian_id' => $this->guardian_id,
            'created_at' => $this->created_at,
        ];
    }
}
