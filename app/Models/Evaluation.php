<?php

namespace App\Models;

use App\Enums\EvaluationLevelRating;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_id',
    'class_offering_id',
    'class_session_id',
    'numeric_score',
    'numeric_score_max',
    'level_rating',
    'participation_rating',
    'understanding_rating',
    'homework_rating',
    'discipline_rating',
    'note',
    'created_by',
])]
class Evaluation extends Model
{
    protected function casts(): array
    {
        return [
            'numeric_score' => 'decimal:2',
            'numeric_score_max' => 'decimal:2',
            'level_rating' => EvaluationLevelRating::class,
            'participation_rating' => 'integer',
            'understanding_rating' => 'integer',
            'homework_rating' => 'integer',
            'discipline_rating' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function classOffering(): BelongsTo
    {
        return $this->belongsTo(ClassOffering::class);
    }

    public function classSession(): BelongsTo
    {
        return $this->belongsTo(ClassSession::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
