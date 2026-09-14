<?php

namespace App\Models;

use App\Enums\CompensationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'payroll_run_id',
    'teacher_id',
    'compensation_type',
    'sessions_count',
    'base_amount',
    'deductions',
    'bonus',
    'net_amount',
    'notes',
])]
class PayrollItem extends Model
{
    protected static function booted(): void
    {
        static::saving(function (PayrollItem $item): void {
            $item->recalculateNetAmount();
        });
    }

    protected function casts(): array
    {
        return [
            'compensation_type' => CompensationType::class,
            'base_amount' => 'decimal:3',
            'deductions' => 'decimal:3',
            'bonus' => 'decimal:3',
            'net_amount' => 'decimal:3',
        ];
    }

    public function recalculateNetAmount(): void
    {
        if ($this->base_amount === null) {
            $this->net_amount = null;

            return;
        }

        $this->net_amount = round(
            (float) $this->base_amount + (float) $this->bonus - (float) $this->deductions,
            3
        );
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
