<?php

namespace Database\Seeders;

use App\Enums\SubjectSelectionMode;
use App\Models\ProductType;
use Illuminate\Database\Seeder;

class ProductTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'key' => 'full-bundle',
                'name_ar' => 'باقة شاملة',
                'name_en' => 'Full Bundle',
                'description' => 'تشمل كل مواد الصف',
                'subject_selection_mode' => SubjectSelectionMode::AllSubjects,
                'requires_grade' => true,
                'is_schedulable' => true,
            ],
            [
                'key' => 'single-subject',
                'name_ar' => 'مادة واحدة',
                'name_en' => 'Single Subject',
                'description' => 'مادة واحدة محددة من الإدارة',
                'subject_selection_mode' => SubjectSelectionMode::SingleSubject,
                'requires_grade' => true,
                'is_schedulable' => true,
            ],
            [
                'key' => 'choose-subjects',
                'name_ar' => 'اختيار مواد',
                'name_en' => 'Choose Subjects',
                'description' => 'ولي الأمر يختار عددًا محددًا من المواد',
                'subject_selection_mode' => SubjectSelectionMode::ChooseSubjects,
                'requires_grade' => true,
                'is_schedulable' => true,
            ],
            [
                'key' => 'private-lesson',
                'name_ar' => 'حصة خاصة',
                'name_en' => 'Private Lesson',
                'description' => 'حصة خاصة تُدار يدويًا',
                'subject_selection_mode' => SubjectSelectionMode::None,
                'requires_grade' => true,
                'is_schedulable' => true,
            ],
            [
                'key' => 'trial-exam',
                'name_ar' => 'اختبار تجريبي',
                'name_en' => 'Trial Exam',
                'description' => 'منتج غير قابل للجدولة في شعب',
                'subject_selection_mode' => SubjectSelectionMode::None,
                'requires_grade' => false,
                'is_schedulable' => false,
            ],
        ];

        foreach ($types as $type) {
            ProductType::query()->updateOrCreate(
                ['key' => $type['key']],
                [
                    ...$type,
                    'is_active' => true,
                ],
            );
        }
    }
}
