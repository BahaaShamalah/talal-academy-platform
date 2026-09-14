<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Enums\ClassOfferingStatus;
use App\Enums\PlanDurationType;
use App\Models\Branch;
use App\Models\ClassSchedule;
use App\Models\EducationalStage;
use App\Models\Grade;
use App\Models\Hall;
use App\Models\PlanDuration;
use App\Models\ProductType;
use App\Models\Subject;
use App\Models\User;
use App\Services\AcademicPeriodService;
use App\Services\ClassOfferingService;
use App\Services\PlanService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AcademicStructureSeeder extends Seeder
{
    public function run(): void
    {
        $teacher = User::query()->firstOrCreate(
            ['email' => 'teacher@example.com'],
            [
                'name' => 'Teacher User',
                'phone' => '0500000001',
                'password' => 'password',
                'is_teaching_staff' => true,
            ],
        );
        $teacher->assignRole('teacher');
        $teacher->forceFill(['is_teaching_staff' => true])->save();

        $teacher2 = User::query()->firstOrCreate(
            ['email' => 'teacher2@example.com'],
            [
                'name' => 'Teacher Two',
                'phone' => '0500000002',
                'password' => 'password',
                'is_teaching_staff' => true,
            ],
        );
        $teacher2->assignRole('teacher');
        $teacher2->forceFill(['is_teaching_staff' => true])->save();

        $branch = Branch::query()->create([
            'name' => 'الفرع الرئيسي',
            'country' => 'الكويت',
            'city' => 'حولي',
            'address' => 'حولي، شارع تونس',
            'phone_1' => '22200000',
            'phone_2' => '22200001',
            'is_main' => true,
        ]);

        $hallA = Hall::query()->create([
            'branch_id' => $branch->id,
            'name' => 'قاعة أ',
            'capacity' => 25,
        ]);

        $hallB = Hall::query()->create([
            'branch_id' => $branch->id,
            'name' => 'قاعة ب',
            'capacity' => 30,
        ]);

        $math = Subject::query()->create(['name' => 'رياضيات', 'description' => 'مادة الرياضيات']);
        $physics = Subject::query()->create(['name' => 'فيزياء', 'description' => 'مادة الفيزياء']);
        $chemistry = Subject::query()->create(['name' => 'كيمياء', 'description' => 'مادة الكيمياء']);
        $arabic = Subject::query()->create(['name' => 'لغة عربية', 'description' => 'مادة اللغة العربية']);
        $english = Subject::query()->create(['name' => 'لغة إنجليزية', 'description' => 'مادة اللغة الإنجليزية']);

        $middle = EducationalStage::query()->create(['name' => 'متوسط', 'order' => 1]);
        EducationalStage::query()->create(['name' => 'ثانوي', 'order' => 2]);

        $grade7 = Grade::query()->create(['educational_stage_id' => $middle->id, 'name' => 'الصف السابع', 'order' => 1]);
        $grade8 = Grade::query()->create(['educational_stage_id' => $middle->id, 'name' => 'الصف الثامن', 'order' => 2]);
        $grade9 = Grade::query()->create(['educational_stage_id' => $middle->id, 'name' => 'الصف التاسع', 'order' => 3]);

        $subjectIds = [$math->id, $physics->id, $chemistry->id, $arabic->id];
        foreach ([$grade7, $grade8, $grade9] as $grade) {
            $grade->subjects()->sync($subjectIds);
        }

        $grade9->subjects()->syncWithoutDetaching([$english->id]);

        /** @var AcademicPeriodService $periodService */
        $periodService = app(AcademicPeriodService::class);

        $firstPeriod = $periodService->create([
            'name' => 'الفصل الأول 2026',
            'start_date' => Carbon::create(2026, 8, 1)->toDateString(),
            'end_date' => Carbon::create(2026, 12, 31)->toDateString(),
            'status' => AcademicPeriodStatus::Draft->value,
            'registration_opens_at' => Carbon::create(2026, 7, 1)->toDateString(),
            'registration_closes_at' => Carbon::create(2026, 9, 15)->toDateString(),
        ]);

        $periodService->create([
            'name' => 'الفصل الثاني 2026',
            'start_date' => Carbon::create(2027, 1, 15)->toDateString(),
            'end_date' => Carbon::create(2027, 6, 15)->toDateString(),
            'status' => AcademicPeriodStatus::Draft->value,
            'registration_opens_at' => Carbon::create(2026, 12, 1)->toDateString(),
            'registration_closes_at' => Carbon::create(2027, 2, 15)->toDateString(),
        ]);

        $periodService->activate($firstPeriod);

        $durationPeriod = PlanDuration::query()->create([
            'name' => 'الفصل الدراسي الأول',
            'start_date' => Carbon::create(2026, 8, 1)->toDateString(),
            'end_date' => Carbon::create(2026, 12, 31)->toDateString(),
        ]);

        PlanDuration::query()->create([
            'name' => 'الفصل الدراسي الثاني',
            'start_date' => Carbon::create(2027, 1, 15)->toDateString(),
            'end_date' => Carbon::create(2027, 6, 15)->toDateString(),
        ]);

        $planService = app(PlanService::class);

        $fullBundle = ProductType::query()->where('key', 'full-bundle')->firstOrFail();
        $singleSubject = ProductType::query()->where('key', 'single-subject')->firstOrFail();

        $planService->create([
            'product_type_id' => $fullBundle->id,
            'grade_id' => $grade7->id,
            'subject_id' => null,
            'name' => 'باقة شاملة — صف سابع (شهري)',
            'description' => 'اشتراك شهري متجدد لكل مواد الصف السابع',
            'duration_type' => PlanDurationType::MonthlyRecurring,
            'duration_period_id' => null,
            'price' => 120.000,
            'compare_at_price' => 150.000,
            'is_active' => true,
        ]);

        $planService->create([
            'product_type_id' => $singleSubject->id,
            'grade_id' => $grade7->id,
            'subject_id' => $math->id,
            'name' => 'باقة رياضيات — الفصل الأول',
            'description' => 'باقة مادة واحدة (رياضيات) مرتبطة بالفصل الدراسي الأول',
            'duration_type' => PlanDurationType::FixedPeriod,
            'duration_period_id' => $durationPeriod->id,
            'price' => 80.000,
            'compare_at_price' => null,
            'is_active' => true,
        ]);

        $classOfferingService = app(ClassOfferingService::class);

        $mathOffering = $classOfferingService->create([
            'grade_id' => $grade7->id,
            'subject_id' => $math->id,
            'teacher_id' => $teacher->id,
            'hall_id' => $hallA->id,
            'period_id' => $firstPeriod->id,
            'status' => ClassOfferingStatus::Active->value,
        ]);

        ClassSchedule::query()->create([
            'class_offering_id' => $mathOffering->id,
            'day_of_week' => 0,
            'start_time' => '16:00',
            'end_time' => '18:00',
        ]);

        $physicsOffering = $classOfferingService->create([
            'grade_id' => $grade7->id,
            'subject_id' => $physics->id,
            'teacher_id' => $teacher2->id,
            'hall_id' => $hallB->id,
            'period_id' => $firstPeriod->id,
            'status' => ClassOfferingStatus::Active->value,
        ]);

        ClassSchedule::query()->create([
            'class_offering_id' => $physicsOffering->id,
            'day_of_week' => 1,
            'start_time' => '16:00',
            'end_time' => '18:00',
        ]);

        foreach ([
            ['grade' => $grade8, 'subject' => $physics, 'hall' => $hallB, 'teacher' => $teacher, 'day' => 2],
            ['grade' => $grade9, 'subject' => $chemistry, 'hall' => $hallA, 'teacher' => $teacher2, 'day' => 3],
        ] as $item) {
            $offering = $classOfferingService->create([
                'grade_id' => $item['grade']->id,
                'subject_id' => $item['subject']->id,
                'teacher_id' => $item['teacher']->id,
                'hall_id' => $item['hall']->id,
                'period_id' => $firstPeriod->id,
                'status' => ClassOfferingStatus::Active->value,
            ]);

            ClassSchedule::query()->create([
                'class_offering_id' => $offering->id,
                'day_of_week' => $item['day'],
                'start_time' => '17:00',
                'end_time' => '19:00',
            ]);
        }
    }
}
