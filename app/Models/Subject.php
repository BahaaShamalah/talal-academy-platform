<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'description'])]
class Subject extends Model
{
    public function grades(): BelongsToMany
    {
        return $this->belongsToMany(Grade::class, 'grade_subjects')->withTimestamps();
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class);
    }

    public function classOfferings(): HasMany
    {
        return $this->hasMany(ClassOffering::class);
    }
}
