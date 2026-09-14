<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SupportTicketMessage */
class SupportTicketMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_id' => $this->ticket_id,
            'sender_type' => $this->sender_type?->value,
            'sender_guardian_id' => $this->sender_guardian_id,
            'sender_user_id' => $this->sender_user_id,
            'message' => $this->message,
            'sender_guardian' => $this->whenLoaded('senderGuardian', fn () => $this->senderGuardian ? [
                'id' => $this->senderGuardian->id,
                'full_name' => $this->senderGuardian->full_name,
            ] : null),
            'sender_user' => $this->whenLoaded('senderUser', fn () => $this->senderUser ? [
                'id' => $this->senderUser->id,
                'name' => $this->senderUser->name,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
