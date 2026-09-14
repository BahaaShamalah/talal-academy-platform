<?php

namespace App\Http\Requests\Evaluation;

class UpdateEvaluationRequest extends StoreEvaluationRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::fieldRules(),
            'class_offering_id' => ['sometimes', 'required', 'integer', 'exists:class_offerings,id'],
        ];
    }
}
