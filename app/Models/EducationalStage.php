<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'order'])]
class EducationalStage extends Model
{
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }
}
