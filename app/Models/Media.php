<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'original_filename',
        'disk',
        'path',
        'mime_type',
        'width',
        'height',
        'size_bytes',
        'alt_text',
        'uploaded_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'size_bytes' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function absolutePath(): ?string
    {
        if (! Storage::disk($this->disk)->exists($this->path)) {
            return null;
        }

        return Storage::disk($this->disk)->path($this->path);
    }
}
