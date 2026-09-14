<?php

namespace App\Models;

use App\Enums\SubjectSelectionMode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'key',
    'name_ar',
    'name_en',
    'description',
    'subject_selection_mode',
    'requires_grade',
    'is_schedulable',
    'is_active',
])]
class ProductType extends Model
{
    protected function casts(): array
    {
        return [
            'subject_selection_mode' => SubjectSelectionMode::class,
            'requires_grade' => 'boolean',
            'is_schedulable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class);
    }

    public static function makeUniqueKey(string $nameAr, ?string $nameEn = null): string
    {
        $base = Str::slug((string) ($nameEn ?: ''));
        if ($base === '') {
            $base = Str::slug($nameAr);
        }
        if ($base === '') {
            $base = 'type-'.substr(md5($nameAr), 0, 8);
        }

        $key = $base;
        $i = 2;
        while (static::query()->where('key', $key)->exists()) {
            $key = $base.'-'.$i;
            $i++;
        }

        return $key;
    }
}
