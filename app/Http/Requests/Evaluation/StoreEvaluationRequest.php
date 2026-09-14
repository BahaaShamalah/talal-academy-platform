<?php

namespace App\Http\Requests\Evaluation;

use App\Enums\EvaluationLevelRating;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return $this->fieldRules();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function fieldRules(): array
    {
        return [
            'class_offering_id' => ['required', 'integer', 'exists:class_offerings,id'],
            'class_session_id' => ['nullable', 'integer', 'exists:class_sessions,id'],
            'numeric_score' => ['nullable', 'numeric', 'min:0'],
            'numeric_score_max' => ['nullable', 'numeric', 'min:0.01'],
            'level_rating' => ['nullable', Rule::enum(EvaluationLevelRating::class)],
            'participation_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'understanding_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'homework_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'discipline_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'note' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
