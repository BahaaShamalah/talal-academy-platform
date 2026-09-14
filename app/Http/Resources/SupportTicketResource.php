<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SupportTicket */
class SupportTicketResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guardian_id' => $this->guardian_id,
            'student_id' => $this->student_id,
            'subject' => $this->subject,
            'status' => $this->status?->value,
            'assigned_to' => $this->assigned_to,
            'guardian' => $this->whenLoaded('guardian', fn () => $this->guardian ? [
                'id' => $this->guardian->id,
                'full_name' => $this->guardian->full_name,
                'phone' => $this->guardian->phone,
            ] : null),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id,
                'full_name' => $this->student->full_name,
            ] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
            ] : null),
            'messages' => SupportTicketMessageResource::collection($this->whenLoaded('messages')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
