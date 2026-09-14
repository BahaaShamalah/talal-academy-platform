<?php

namespace Database\Seeders;

use App\Enums\PlanDurationType;
use App\Models\EducationalStage;
use App\Models\Grade;
use App\Models\Plan;
use App\Models\ProductType;
use App\Models\Subject;
use App\Services\PlanService;
use Illuminate\Database\Seeder;
/**
 * يضمن أنواع المنتجات، ربط المواد بالصفوف، وباقات المواد المفردة لكل مرحلة
 * لتظهر صفحة البرامج التسويقية: باقة شاملة + سعر كل مادة.
 */
class CatalogProgramsPricingSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ProductTypeSeeder::class);

        $subjects = Subject::query()->orderBy('id')->get();
        if ($subjects->isEmpty()) {
            $this->command?->warn('No subjects found — skipped single-subject plans.');

            return;
        }

        $grades = Grade::query()->orderBy('id')->get();
        foreach ($grades as $grade) {
            $grade->subjects()->syncWithoutDetaching($subjects->pluck('id')->all());
        }

        $fullBundle = ProductType::query()->where('key', 'full-bundle')->firstOrFail();
        $single = ProductType::query()->where('key', 'single-subject')->firstOrFail();

        // تأكد أن الباقات الشاملة الحالية مربوطة بنوع المنتج الصحيح
        Plan::query()
            ->whereNull('subject_id')
            ->whereNotNull('educational_stage_id')
            ->where('is_active', true)
            ->update(['product_type_id' => $fullBundle->id]);

        $stagePrices = [
            // educational_stage_id => [package (موجود مسبقاً), single subject]
            2 => 85.000,  // ابتدائي — الباقة 280
            1 => 110.000, // متوسط — الباقة 380
            3 => 140.000, // ثانوي — الباقة 480
        ];

        $planService = app(PlanService::class);
        $stages = EducationalStage::query()->orderBy('order')->orderBy('id')->get();

        foreach ($stages as $stage) {
            $unitPrice = $stagePrices[$stage->id] ?? 100.000;

            foreach ($subjects as $subject) {
                $name = "مادة {$subject->name} — {$stage->name}";
                $existing = Plan::query()
                    ->where('educational_stage_id', $stage->id)
                    ->where('subject_id', $subject->id)
                    ->where('product_type_id', $single->id)
                    ->first();

                if ($existing) {
                    $existing->update([
                        'name' => $name,
                        'price' => $unitPrice,
                        'is_active' => true,
                    ]);

                    continue;
                }

                $planService->create([
                    'product_type_id' => $single->id,
                    'educational_stage_id' => $stage->id,
                    'grade_id' => null,
                    'subject_id' => $subject->id,
                    'name' => $name,
                    'description' => 'اشتراك مادة واحدة ضمن المرحلة',
                    'duration_type' => PlanDurationType::MonthlyRecurring,
                    'duration_period_id' => null,
                    'price' => $unitPrice,
                    'compare_at_price' => null,
                    'is_active' => true,
                ]);
            }
        }

        $this->command?->info('Catalog programs pricing ready: full bundles + single-subject plans per stage.');
    }
}
