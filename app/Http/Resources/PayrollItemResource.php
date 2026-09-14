<?php

namespace App\Http\Resources;

use App\Models\PayrollItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollItem */
class PayrollItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payroll_run_id' => $this->payroll_run_id,
            'teacher_id' => $this->teacher_id,
            'compensation_type' => $this->compensation_type?->value,
            'sessions_count' => $this->sessions_count,
            'base_amount' => $this->base_amount,
            'deductions' => $this->deductions,
            'bonus' => $this->bonus,
            'net_amount' => $this->net_amount,
            'notes' => $this->notes,
            'teacher' => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ]),
            'payroll_run' => $this->whenLoaded('payrollRun', fn () => [
                'id' => $this->payrollRun->id,
                'period_month' => $this->payrollRun->period_month?->toDateString(),
                'status' => $this->payrollRun->status?->value,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
