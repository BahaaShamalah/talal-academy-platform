<?php

namespace App\Services;

use App\Models\InstallmentTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InstallmentTemplateService
{
    /**
     * @return LengthAwarePaginator<int, InstallmentTemplate>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return InstallmentTemplate::query()
            ->withCount('plans')
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): InstallmentTemplate
    {
        $this->assertTemplateData($data);

        return InstallmentTemplate::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(InstallmentTemplate $template, array $data): InstallmentTemplate
    {
        $merged = array_merge($template->only([
            'name',
            'number_of_installments',
            'split_percentages',
            'due_offset_days',
        ]), $data);

        $this->assertTemplateData($merged);

        $template->update($data);

        return $template->refresh();
    }

    public function delete(InstallmentTemplate $template): void
    {
        if ($template->plans()->exists()) {
            throw ValidationException::withMessages([
                'installment_template' => ['لا يمكن حذف خطة تقسيط مرتبطة بباقات.'],
            ]);
        }

        $template->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertTemplateData(array $data): void
    {
        $count = (int) ($data['number_of_installments'] ?? 0);
        $percentages = $data['split_percentages'] ?? [];
        $offsets = $data['due_offset_days'] ?? [];

        if (! is_array($percentages) || ! is_array($offsets)) {
            throw ValidationException::withMessages([
                'split_percentages' => ['صيغة نسب التقسيط غير صالحة.'],
            ]);
        }

        if (count($percentages) !== $count || count($offsets) !== $count) {
            throw ValidationException::withMessages([
                'number_of_installments' => ['عدد الدفعات يجب أن يطابق طول نسب التقسيط وأيام الاستحقاق.'],
            ]);
        }

        $sum = array_sum(array_map('floatval', $percentages));
        if (abs($sum - 100) > 0.0001) {
            throw ValidationException::withMessages([
                'split_percentages' => ['مجموع نسب التقسيط يجب أن يساوي 100 بالضبط.'],
            ])->status(422);
        }

        foreach ($offsets as $offset) {
            if (! is_numeric($offset) || (int) $offset < 0) {
                throw ValidationException::withMessages([
                    'due_offset_days' => ['أيام الاستحقاق يجب أن تكون أرقامًا صحيحة غير سالبة.'],
                ]);
            }
        }
    }
}
