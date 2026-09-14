<?php

namespace App\Models;

use App\Enums\GuardianRelationship;
use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'full_name',
    'civil_id',
    'phone',
    'phone_secondary',
    'email',
    'relationship',
    'address',
    'password',
    'avatar_media_id',
])]
#[Hidden(['password', 'remember_token'])]
class Guardian extends Authenticatable
{
    /** @use HasFactory<GuardianFactory> */
    use HasApiTokens, HasFactory;

    protected function casts(): array
    {
        return [
            'relationship' => GuardianRelationship::class,
            'password' => 'hashed',
        ];
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function avatarMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'avatar_media_id');
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class)->orderByDesc('created_at');
    }

    /**
     * @return Attribute<string, never>
     */
    protected function creditBalance(): Attribute
    {
        return Attribute::get(function (): string {
            if ($this->relationLoaded('creditTransactions')) {
                $sum = $this->creditTransactions->sum(fn ($t) => (float) $t->amount);
            } else {
                $sum = $this->creditTransactions()->sum('amount');
            }

            return number_format((float) $sum, 3, '.', '');
        });
    }
}
