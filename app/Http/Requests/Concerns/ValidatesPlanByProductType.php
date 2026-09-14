<?php

namespace App\Http\Requests\Concerns;

use App\Enums\SubjectSelectionMode;
use App\Models\Plan;
use App\Models\ProductType;
use Illuminate\Validation\Validator;

trait ValidatesPlanByProductType
{
    /**
     * @return array<string, array<int, mixed>>
     */
    protected function productTypeFieldRules(bool $updating = false): array
    {
        return [
            'product_type_id' => array_values(array_filter([
                $updating ? 'sometimes' : null,
                'required',
                'integer',
                'exists:product_types,id',
            ])),
            'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'educational_stage_id' => ['nullable', 'integer', 'exists:educational_stages,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'subject_selection_count' => ['nullable', 'integer', 'min:1'],
        ];
    }

    protected function validateAgainstProductType(Validator $validator, bool $updating = false): void
    {
        /** @var Plan|null $plan */
        $plan = $updating ? $this->route('plan') : null;

        $productTypeId = $this->input('product_type_id', $plan?->product_type_id);
        if (! $productTypeId) {
            return;
        }

        $productType = ProductType::query()->find($productTypeId);
        if (! $productType) {
            return;
        }

        $gradeId = $this->has('grade_id') ? $this->input('grade_id') : $plan?->grade_id;
        $stageId = $this->has('educational_stage_id')
            ? $this->input('educational_stage_id')
            : $plan?->educational_stage_id;
        $subjectId = $this->has('subject_id') ? $this->input('subject_id') : $plan?->subject_id;
        $selectionCount = $this->has('subject_selection_count')
            ? $this->input('subject_selection_count')
            : $plan?->subject_selection_count;

        if (! empty($gradeId) && ! empty($stageId)) {
            $validator->errors()->add(
                'educational_stage_id',
                'اختر إما صفًا محددًا أو مرحلة كاملة، وليس الاثنين معًا.',
            );
        }

        if ($productType->requires_grade && empty($gradeId) && empty($stageId)) {
            $validator->errors()->add(
                'grade_id',
                'اختر صفًا أو مرحلة كاملة لهذا النوع من الباقات.',
            );
        }

        if (! $productType->requires_grade) {
            if (! empty($gradeId)) {
                $validator->errors()->add('grade_id', 'هذا النوع لا يرتبط بصف أو مرحلة.');
            }
            if (! empty($stageId)) {
                $validator->errors()->add('educational_stage_id', 'هذا النوع لا يرتبط بصف أو مرحلة.');
            }
        }

        switch ($productType->subject_selection_mode) {
            case SubjectSelectionMode::AllSubjects:
                if (! empty($subjectId)) {
                    $validator->errors()->add('subject_id', 'يجب أن تكون المادة فارغة للباقة الشاملة.');
                }
                if ($selectionCount !== null && $selectionCount !== '') {
                    $validator->errors()->add('subject_selection_count', 'عدد المواد المختار لا ينطبق على هذا النوع.');
                }
                break;

            case SubjectSelectionMode::SingleSubject:
                if (empty($subjectId)) {
                    $validator->errors()->add('subject_id', 'المادة مطلوبة لهذا النوع من الباقات.');
                }
                if ($selectionCount !== null && $selectionCount !== '') {
                    $validator->errors()->add('subject_selection_count', 'عدد المواد المختار لا ينطبق على هذا النوع.');
                }
                break;

            case SubjectSelectionMode::ChooseSubjects:
                if (! empty($subjectId)) {
                    $validator->errors()->add('subject_id', 'يجب أن تكون المادة فارغة عند اختيار المواد من ولي الأمر.');
                }
                if (empty($selectionCount) || (int) $selectionCount < 1) {
                    $validator->errors()->add('subject_selection_count', 'حدد عدد المواد المطلوب اختيارها (1 فأكثر).');
                }
                break;

            case SubjectSelectionMode::None:
                if (! empty($subjectId)) {
                    $validator->errors()->add('subject_id', 'يجب أن تكون المادة فارغة لهذا النوع.');
                }
                if ($selectionCount !== null && $selectionCount !== '') {
                    $validator->errors()->add('subject_selection_count', 'عدد المواد المختار لا ينطبق على هذا النوع.');
                }
                break;
        }
    }
}
