<?php

namespace App\Models;

use App\Enums\PlanDurationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'product_type_id',
    'grade_id',
    'educational_stage_id',
    'period_id',
    'subject_id',
    'subject_selection_count',
    'duration_period_id',
    'installment_template_id',
    'name',
    'description',
    'duration_type',
    'price',
    'compare_at_price',
    'is_active',
])]
class Plan extends Model
{
    protected function casts(): array
    {
        return [
            'duration_type' => PlanDurationType::class,
            'price' => 'decimal:2',
            'compare_at_price' => 'decimal:2',
            'is_active' => 'boolean',
            'subject_selection_count' => 'integer',
        ];
    }

    public function productType(): BelongsTo
    {
        return $this->belongsTo(ProductType::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function educationalStage(): BelongsTo
    {
        return $this->belongsTo(EducationalStage::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'period_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function durationPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanDuration::class, 'duration_period_id');
    }

    public function installmentTemplate(): BelongsTo
    {
        return $this->belongsTo(InstallmentTemplate::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(StudentPlanSubscription::class, 'plan_id');
    }

    /** هل الباقة تغطي هذا الصف (صف محدد أو ضمن مرحلة الباقة) */
    public function coversGradeId(int $gradeId): bool
    {
        if ($this->grade_id) {
            return (int) $this->grade_id === $gradeId;
        }

        if ($this->educational_stage_id) {
            return Grade::query()
                ->where('id', $gradeId)
                ->where('educational_stage_id', $this->educational_stage_id)
                ->exists();
        }

        return true;
    }

    /**
     * الصف الفعلي المستخدم للجدولة/المواد:
     * - باقة صف: grade_id
     * - باقة مرحلة: صف الطالب الحالي إن كان ضمن المرحلة
     */
    public function resolveGradeIdForStudent(?Student $student): ?int
    {
        if ($this->grade_id) {
            return (int) $this->grade_id;
        }

        if (! $this->educational_stage_id || ! $student?->current_grade_id) {
            return null;
        }

        $student->loadMissing('currentGrade');
        $grade = $student->currentGrade;

        if (! $grade || (int) $grade->educational_stage_id !== (int) $this->educational_stage_id) {
            return null;
        }

        return (int) $student->current_grade_id;
    }
}
