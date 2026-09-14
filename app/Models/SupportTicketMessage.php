<?php

namespace App\Models;

use App\Enums\SupportTicketSenderType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ticket_id',
    'sender_type',
    'sender_guardian_id',
    'sender_user_id',
    'message',
    'created_at',
])]
class SupportTicketMessage extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'sender_type' => SupportTicketSenderType::class,
            'created_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function senderGuardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class, 'sender_guardian_id');
    }

    public function senderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}
