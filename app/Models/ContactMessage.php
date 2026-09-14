<?php

namespace App\Models;

use App\Enums\ContactMessageStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'name',
    'phone',
    'phone_secondary',
    'educational_stage_id',
    'message',
    'status',
    'admin_notes',
    'reviewed_by',
    'reviewed_at',
])]
class ContactMessage extends Model
{
    protected function casts(): array
    {
        return [
            'status' => ContactMessageStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function educationalStage(): BelongsTo
    {
        return $this->belongsTo(EducationalStage::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
