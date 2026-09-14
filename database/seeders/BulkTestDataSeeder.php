<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\EvaluationLevelRating;
use App\Enums\Gender;
use App\Enums\GuardianRelationship;
use App\Enums\InstallmentStatus;
use App\Enums\PaymentMethod;
use App\Enums\PlanDurationType;
use App\Enums\SubjectSelectionMode;
use App\Models\AbsenceAlert;
use App\Models\AttendanceRecord;
use App\Models\ClassSession;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Grade;
use App\Models\ClassOffering;
use App\Models\Guardian;
use App\Models\InstallmentTemplate;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;
use App\Models\InvoiceItem;
use App\Models\Plan;
use App\Models\ProductType;
use App\Models\Student;
use App\Models\StudentPlanSubscription;
use App\Models\SubscriptionSelectedSubject;
use App\Models\User;
use App\Services\AttendanceService;
use App\Services\ExamService;
use App\Services\PlanService;
use App\Services\SessionGeneratorService;
use App\Services\StudentService;
use App\Services\SubscriptionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Dense realistic demo data — run manually:
 *   php artisan db:seed --class=BulkTestDataSeeder
 *
 * Safe to re-run: only touches records tagged with the BULK marker.
 * Never call from DatabaseSeeder / migrate:fresh.
 */
class BulkTestDataSeeder extends Seeder
{
    private const MARKER = '[BULK]';

    private const GUARDIAN_CIVIL_PREFIX = '9000';

    private const STUDENT_CIVIL_PREFIX = '9100';

    private const TARGET_STUDENTS = 50;

    /** @var list<string> */
    private array $maleNames = [
        'عبدالله فهد العتيبي', 'محمد سعد المطيري', 'يوسف خالد الشمري', 'أحمد ناصر الدوسري',
        'عمر سليمان القحطاني', 'فيصل عبدالرحمن العجمي', 'خالد جاسم العنزي', 'سعود بدر الرشيدي',
        'تركي ماجد الحربي', 'راشد علي الصباح', 'نواف حمد العازمي', 'بدر فيصل السبيعي',
        'مشاري طلال الظفيري', 'عبدالعزيز وليد المري', 'سلمان إبراهيم الهاجري', 'حمد منصور الجابر',
        'طلال حسن الصقري', 'ماجد فواز الكندري', 'جاسم رياض الفضلي', 'أنس وليد الشطي',
        'زياد كريم الهذال', 'فهد ياسر الرومي', 'نايف سعد المنصوري', 'عدي حسين البلوشي',
        'إياد وائل العبدالهادي',
    ];

    /** @var list<string> */
    private array $femaleNames = [
        'نورة فهد العتيبي', 'سارة سعد المطيري', 'مريم خالد الشمري', 'فاطمة ناصر الدوسري',
        'لينا سليمان القحطاني', 'هيا عبدالرحمن العجمي', 'دانة جاسم العنزي', 'ريم بدر الرشيدي',
        'شهد ماجد الحربي', 'منى علي الصباح', 'جواهر حمد العازمي', 'روان فيصل السبيعي',
        'غادة طلال الظفيري', 'أسماء وليد المري', 'لطيفة إبراهيم الهاجري', 'هند منصور الجابر',
        'مها حسن الصقري', 'إيمان فواز الكندري', 'أمل رياض الفضلي', 'ياسمين وليد الشطي',
        'تالا كريم الهذال', 'جود ياسر الرومي', 'لولو سعد المنصوري', 'رزان حسين البلوشي',
        'سلمى وائل العبدالهادي',
    ];

    /** @var list<string> */
    private array $guardianNames = [
        'فهد عبدالله العتيبي', 'سعد محمد المطيري', 'خالد يوسف الشمري', 'ناصر أحمد الدوسري',
        'سليمان عمر القحطاني', 'عبدالرحمن فيصل العجمي', 'جاسم خالد العنزي', 'بدر سعود الرشيدي',
        'ماجد تركي الحربي', 'علي راشد الصباح', 'حمد نواف العازمي', 'فيصل بدر السبيعي',
        'طلال مشاري الظفيري', 'وليد عبدالعزيز المري', 'إبراهيم سلمان الهاجري', 'منصور حمد الجابر',
        'حسن طلال الصقري', 'فواز ماجد الكندري', 'رياض جاسم الفضلي', 'وليد أنس الشطي',
        'كريم زياد الهذال', 'ياسر فهد الرومي', 'سعد نايف المنصوري', 'حسين عدي البلوشي',
        'وائل إياد العبدالهادي', 'عبدالله نورة العتيبي', 'محمد سارة المطيري', 'يوسف مريم الشمري',
        'أحمد فاطمة الدوسري', 'عمر لينا القحطاني', 'فيصل هيا العجمي', 'خالد دانة العنزي',
        'سعود ريم الرشيدي', 'تركي شهد الحربي', 'راشد منى الصباح',
    ];

    private int $createdStudents = 0;

    private int $createdGuardians = 0;

    private int $paidFull = 0;

    private int $pendingInvoices = 0;

    private int $installmentSubs = 0;

    private int $sessionsGenerated = 0;

    private int $attendanceMarked = 0;

    private int $evaluationsCreated = 0;

    private int $examsCreated = 0;

    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->first()
            ?? User::query()->role('admin')->first();

        if (! $admin) {
            $this->command?->error('لا يوجد مستخدم admin — شغّل DatabaseSeeder أولًا.');

            return;
        }

        $grades = Grade::query()->orderBy('order')->get();
        if ($grades->isEmpty()) {
            $this->command?->error('لا توجد صفوف في النظام.');

            return;
        }

        $this->command?->info('تنظيف بيانات BULK السابقة (إن وُجدت)…');
        $this->purgePreviousBulkData();

        $this->command?->info('التأكد من وجود باقات كافية للتوزيع…');
        $plans = $this->ensureBulkPlans($admin);

        $teacher = User::query()->where('email', 'teacher@example.com')->first() ?? $admin;

        $this->command?->info('إنشاء أولياء الأمور والطلاب والاشتراكات…');
        $students = $this->seedGuardiansAndStudents($grades, $plans, $admin);

        $this->command?->info('توليد الجلسات والحضور التاريخي…');
        $this->seedHistoricalAttendance($students, $admin);

        $this->command?->info('إنشاء تقييمات واختبارات…');
        $this->seedEvaluationsAndExams($students, $teacher, $admin);

        $absenceAlerts = AbsenceAlert::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->count();

        $overdueInvoices = Invoice::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->where('status', 'pending')
            ->count();

        $overdueInstallments = InvoiceInstallment::query()
            ->where('status', InstallmentStatus::Pending)
            ->whereDate('due_date', '<', now()->toDateString())
            ->whereHas('invoice', fn ($q) => $q->whereIn('student_id', $students->pluck('id')))
            ->count();

        $this->command?->newLine();
        $this->command?->info('=== ملخص BulkTestDataSeeder ===');
        $this->command?->info("أولياء أمور: {$this->createdGuardians}");
        $this->command?->info("طلاب: {$this->createdStudents}");
        $this->command?->info("اشتراكات مدفوعة بالكامل: {$this->paidFull}");
        $this->command?->info("فواتير pending: {$this->pendingInvoices}");
        $this->command?->info("اشتراكات تقسيط: {$this->installmentSubs}");
        $this->command?->info("جلسات مولَّدة/مستخدمة للحضور: {$this->sessionsGenerated}");
        $this->command?->info("سجلات حضور: {$this->attendanceMarked}");
        $this->command?->info("تقييمات: {$this->evaluationsCreated}");
        $this->command?->info("اختبارات: {$this->examsCreated}");
        $this->command?->info("تنبيهات غياب متكرر: {$absenceAlerts}");
        $this->command?->info("فواتير متأخرة (pending): {$overdueInvoices}");
        $this->command?->info("أقساط متأخرة: {$overdueInstallments}");
    }

    private function purgePreviousBulkData(): void
    {
        $guardianIds = Guardian::query()
            ->where('civil_id', 'like', self::GUARDIAN_CIVIL_PREFIX.'%')
            ->pluck('id');

        $studentIds = Student::query()
            ->where(function ($q) use ($guardianIds) {
                $q->where('notes', self::MARKER)
                    ->orWhere('civil_id', 'like', self::STUDENT_CIVIL_PREFIX.'%');
                if ($guardianIds->isNotEmpty()) {
                    $q->orWhereIn('guardian_id', $guardianIds);
                }
            })
            ->pluck('id');

        if ($studentIds->isEmpty() && $guardianIds->isEmpty()) {
            Exam::query()->where('name', 'like', self::MARKER.'%')->delete();
            Plan::query()->where('name', 'like', self::MARKER.'%')->delete();

            return;
        }

        DB::transaction(function () use ($studentIds, $guardianIds) {
            AbsenceAlert::query()->whereIn('student_id', $studentIds)->delete();
            AttendanceRecord::query()->whereIn('student_id', $studentIds)->delete();
            Evaluation::query()->whereIn('student_id', $studentIds)->delete();
            ExamResult::query()->whereIn('student_id', $studentIds)->delete();

            $bulkExamIds = Exam::query()->where('name', 'like', self::MARKER.'%')->pluck('id');
            ExamResult::query()->whereIn('exam_id', $bulkExamIds)->delete();
            Exam::query()->whereIn('id', $bulkExamIds)->delete();

            Enrollment::query()->whereIn('student_id', $studentIds)->delete();

            $subIds = StudentPlanSubscription::query()->whereIn('student_id', $studentIds)->pluck('id');
            SubscriptionSelectedSubject::query()
                ->whereIn('student_plan_subscription_id', $subIds)
                ->delete();
            StudentPlanSubscription::query()->whereIn('id', $subIds)->delete();

            $invoiceIds = Invoice::query()->whereIn('student_id', $studentIds)->pluck('id');
            InvoiceInstallment::query()->whereIn('invoice_id', $invoiceIds)->delete();
            InvoiceItem::query()->whereIn('invoice_id', $invoiceIds)->delete();
            Invoice::query()->whereIn('id', $invoiceIds)->delete();

            Student::query()->whereIn('id', $studentIds)->delete();
            Guardian::query()->whereIn('id', $guardianIds)->delete();

            Plan::query()->where('name', 'like', self::MARKER.'%')->delete();
        });
    }

    /**
     * @return array{full: Plan, single: Plan, choose: Plan, gradeExtras: list<Plan>}
     */
    private function ensureBulkPlans(User $admin): array
    {
        $planService = app(PlanService::class);
        $fullBundle = ProductType::query()->where('key', 'full-bundle')->firstOrFail();
        $single = ProductType::query()->where('key', 'single-subject')->firstOrFail();
        $choose = ProductType::query()->where('key', 'choose-subjects')->firstOrFail();
        $template = InstallmentTemplate::query()->orderBy('id')->first();

        $existingFull = Plan::query()
            ->whereHas('productType', fn ($q) => $q->where('key', 'full-bundle'))
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        $existingSingle = Plan::query()
            ->whereHas('productType', fn ($q) => $q->where('key', 'single-subject'))
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        $choosePlan = Plan::query()
            ->where('name', self::MARKER.' باقة اختيار مواد — صف سابع')
            ->first();

        if (! $choosePlan) {
            $grade7 = Grade::query()->orderBy('order')->firstOrFail();
            $choosePlan = $planService->create([
                'product_type_id' => $choose->id,
                'grade_id' => $grade7->id,
                'subject_id' => null,
                'subject_selection_count' => 2,
                'name' => self::MARKER.' باقة اختيار مواد — صف سابع',
                'description' => 'بيانات تجريبية — اختيار مادتين',
                'duration_type' => PlanDurationType::MonthlyRecurring,
                'duration_period_id' => null,
                'price' => 95.000,
                'is_active' => true,
            ]);
            if ($template) {
                $choosePlan->update(['installment_template_id' => $template->id]);
            }
        }

        if ($existingFull && $template && ! $existingFull->installment_template_id) {
            // Keep existing plan untouched if already configured; installment uses plan 1 from InstallmentSeeder.
        }

        $extras = [];
        $offeringsByGrade = ClassOffering::query()
            ->with(['grade', 'subject'])
            ->get()
            ->groupBy(fn (ClassOffering $co) => $co->grade_id);

        foreach ($offeringsByGrade as $gradeId => $offerings) {
            if (! $gradeId) {
                continue;
            }
            $hasPlan = Plan::query()
                ->where('grade_id', $gradeId)
                ->where('is_active', true)
                ->exists();

            if ($hasPlan) {
                continue;
            }

            $offering = $offerings->first();
            $grade = Grade::query()->find($gradeId);
            $name = self::MARKER.' مادة '.$offering->subject?->name.' — '.$grade?->name;
            $plan = Plan::query()->where('name', $name)->first();
            if (! $plan) {
                $plan = $planService->create([
                    'product_type_id' => $single->id,
                    'grade_id' => (int) $gradeId,
                    'subject_id' => $offering->subject_id,
                    'name' => $name,
                    'description' => 'بيانات تجريبية',
                    'duration_type' => PlanDurationType::MonthlyRecurring,
                    'duration_period_id' => null,
                    'price' => 75.000,
                    'is_active' => true,
                ]);
            }
            $extras[] = $plan;
        }

        if (! $existingFull) {
            $grade7 = Grade::query()->orderBy('order')->firstOrFail();
            $existingFull = $planService->create([
                'product_type_id' => $fullBundle->id,
                'grade_id' => $grade7->id,
                'subject_id' => null,
                'name' => self::MARKER.' باقة شاملة — صف سابع',
                'description' => 'بيانات تجريبية',
                'duration_type' => PlanDurationType::MonthlyRecurring,
                'duration_period_id' => null,
                'price' => 120.000,
                'is_active' => true,
            ]);
            if ($template) {
                $existingFull->update(['installment_template_id' => $template->id]);
            }
        }

        if (! $existingSingle) {
            $grade7 = Grade::query()->orderBy('order')->firstOrFail();
            $mathOffering = ClassOffering::query()
                ->where('grade_id', $grade7->id)
                ->orderBy('id')
                ->firstOrFail();
            $existingSingle = $planService->create([
                'product_type_id' => $single->id,
                'grade_id' => $grade7->id,
                'subject_id' => $mathOffering->subject_id,
                'name' => self::MARKER.' مادة واحدة — صف سابع',
                'description' => 'بيانات تجريبية',
                'duration_type' => PlanDurationType::MonthlyRecurring,
                'duration_period_id' => null,
                'price' => 80.000,
                'is_active' => true,
            ]);
        }

        return [
            'full' => $existingFull->fresh(['productType', 'installmentTemplate', 'grade']),
            'single' => $existingSingle->fresh(['productType', 'installmentTemplate', 'grade', 'subject']),
            'choose' => $choosePlan->fresh(['productType', 'installmentTemplate', 'grade']),
            'gradeExtras' => $extras,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Grade>  $grades
     * @param  array{full: Plan, single: Plan, choose: Plan, gradeExtras: list<Plan>}  $plans
     * @return \Illuminate\Support\Collection<int, Student>
     */
    private function seedGuardiansAndStudents($grades, array $plans, User $admin)
    {
        $studentService = app(StudentService::class);
        $subscriptionService = app(SubscriptionService::class);

        // 15×2 + 20×1 = 50 students, 35 guardians
        $familySizes = array_merge(array_fill(0, 15, 2), array_fill(0, 20, 1));
        shuffle($familySizes);

        $allNames = [];
        foreach ($this->maleNames as $n) {
            $allNames[] = ['name' => $n, 'gender' => Gender::Male];
        }
        foreach ($this->femaleNames as $n) {
            $allNames[] = ['name' => $n, 'gender' => Gender::Female];
        }
        shuffle($allNames);
        $nameIndex = 0;

        $students = collect();
        $studentIndex = 0;
        $guardianSeq = 1;

        $installmentCapable = collect([$plans['full'], $plans['choose']])
            ->filter(fn (Plan $p) => (bool) $p->installment_template_id)
            ->values();

        foreach (array_chunk($familySizes, 5) as $batchSizes) {
            DB::transaction(function () use (
                $batchSizes,
                &$nameIndex,
                &$guardianSeq,
                &$studentIndex,
                $allNames,
                $grades,
                $plans,
                $installmentCapable,
                $studentService,
                $subscriptionService,
                $admin,
                $students,
            ) {
                foreach ($batchSizes as $familySize) {
                    $gName = $this->guardianNames[($guardianSeq - 1) % count($this->guardianNames)];
                    $civil = self::GUARDIAN_CIVIL_PREFIX.str_pad((string) $guardianSeq, 8, '0', STR_PAD_LEFT);
                    $phone = '0599'.str_pad((string) $guardianSeq, 6, '0', STR_PAD_LEFT);

                    $guardian = Guardian::query()->create([
                        'full_name' => $gName,
                        'civil_id' => $civil,
                        'phone' => $phone,
                        'email' => 'bulk.guardian'.$guardianSeq.'@talal.test',
                        'relationship' => $guardianSeq % 5 === 0
                            ? GuardianRelationship::Mother
                            : GuardianRelationship::Father,
                        'address' => 'الكويت — بيانات تجريبية',
                    ]);
                    $this->createdGuardians++;
                    $guardianSeq++;

                    for ($c = 0; $c < $familySize; $c++) {
                        $meta = $allNames[$nameIndex % count($allNames)];
                        $nameIndex++;
                        $studentIndex++;

                        $grade = $grades[$studentIndex % $grades->count()];
                        $studentCivil = self::STUDENT_CIVIL_PREFIX.str_pad((string) $studentIndex, 8, '0', STR_PAD_LEFT);

                        $student = $studentService->create([
                            'full_name' => $meta['name'],
                            'gender' => $meta['gender']->value,
                            'civil_id' => $studentCivil,
                            'phone' => '0588'.str_pad((string) $studentIndex, 6, '0', STR_PAD_LEFT),
                            'guardian_id' => $guardian->id,
                            'current_grade_id' => $grade->id,
                            'notes' => self::MARKER,
                            'status' => 'active',
                        ]);

                        $this->createdStudents++;
                        $students->push($student);

                        $planPick = $this->pickPlanForStudent($studentIndex, $grade, $plans, $installmentCapable);
                        $paymentMode = $planPick['payment_mode'];
                        $payNow = $planPick['pay_now'];
                        $plan = $planPick['plan'];
                        $selectedSubjects = $planPick['selected_subject_ids'];

                        try {
                            $result = $subscriptionService->subscribeStudentToPlan(
                                $student,
                                $plan,
                                $admin,
                                null,
                                $selectedSubjects,
                                $paymentMode,
                            );

                            if ($paymentMode === 'installment') {
                                $this->installmentSubs++;
                                // Make first installment overdue for half of installment cases.
                                if ($studentIndex % 2 === 0) {
                                    InvoiceInstallment::query()
                                        ->where('invoice_id', $result['invoice']->id)
                                        ->where('sequence', 1)
                                        ->update([
                                            'due_date' => now()->subDays(12)->toDateString(),
                                            'status' => InstallmentStatus::Pending,
                                        ]);
                                }
                            } elseif ($payNow) {
                                $subscriptionService->markInvoicePaid($result['invoice'], PaymentMethod::Cash);
                                $this->paidFull++;
                            } else {
                                $this->pendingInvoices++;
                            }
                        } catch (\Throwable $e) {
                            $this->command?->warn("تخطي اشتراك {$student->full_name}: ".$e->getMessage());
                            Log::warning('BulkTestDataSeeder subscribe failed', [
                                'student' => $student->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }
            });

            $this->command?->info("  … تم إنشاء {$this->createdStudents} / ".self::TARGET_STUDENTS.' طالبًا');
        }

        return $students;
    }

    /**
     * @param  array{full: Plan, single: Plan, choose: Plan, gradeExtras: list<Plan>}  $plans
     * @param  \Illuminate\Support\Collection<int, Plan>  $installmentCapable
     * @return array{plan: Plan, payment_mode: string, pay_now: bool, selected_subject_ids: list<int>|null}
     */
    private function pickPlanForStudent(int $index, Grade $grade, array $plans, $installmentCapable): array
    {
        $gradePlans = Plan::query()
            ->where('grade_id', $grade->id)
            ->where('is_active', true)
            ->with('productType')
            ->get();

        if ($gradePlans->isEmpty()) {
            $gradePlans = collect([$plans['full'], $plans['single'], $plans['choose']]);
        }

        // Rotate product types when available for this grade.
        $byKey = $gradePlans->groupBy(fn (Plan $p) => $p->productType?->key ?? 'other');
        $keys = ['full-bundle', 'single-subject', 'choose-subjects'];
        $preferredKey = $keys[$index % 3];
        $plan = $byKey->get($preferredKey)?->first() ?? $gradePlans->first();

        $selected = null;
        if ($plan->productType?->subject_selection_mode === SubjectSelectionMode::ChooseSubjects) {
            $count = (int) ($plan->subject_selection_count ?: 2);
            $gradeModel = Grade::query()->with('subjects')->find($plan->grade_id);
            $selected = $gradeModel?->subjects->take($count)->pluck('id')->map(fn ($id) => (int) $id)->all() ?? [];
        }

        // ~20% installment (when plan supports), ~20% pending, rest paid.
        $bucket = $index % 10;
        if ($bucket < 2 && $plan->installment_template_id) {
            return [
                'plan' => $plan,
                'payment_mode' => 'installment',
                'pay_now' => false,
                'selected_subject_ids' => $selected,
            ];
        }

        // If wanted installment but plan lacks template, try installment-capable plan of same grade.
        if ($bucket < 2) {
            $alt = $installmentCapable->first(fn (Plan $p) => (int) $p->grade_id === (int) $grade->id)
                ?? $installmentCapable->first();
            if ($alt) {
                $selectedAlt = null;
                if ($alt->productType?->subject_selection_mode === SubjectSelectionMode::ChooseSubjects) {
                    $count = (int) ($alt->subject_selection_count ?: 2);
                    $gradeModel = Grade::query()->with('subjects')->find($alt->grade_id);
                    $selectedAlt = $gradeModel?->subjects->take($count)->pluck('id')->map(fn ($id) => (int) $id)->all() ?? [];
                }

                return [
                    'plan' => $alt,
                    'payment_mode' => 'installment',
                    'pay_now' => false,
                    'selected_subject_ids' => $selectedAlt,
                ];
            }
        }

        if ($bucket < 4) {
            return [
                'plan' => $plan,
                'payment_mode' => 'full',
                'pay_now' => false,
                'selected_subject_ids' => $selected,
            ];
        }

        return [
            'plan' => $plan,
            'payment_mode' => 'full',
            'pay_now' => true,
            'selected_subject_ids' => $selected,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Student>  $students
     */
    private function seedHistoricalAttendance($students, User $admin): void
    {
        $generator = app(SessionGeneratorService::class);
        $attendance = app(AttendanceService::class);

        $from = now()->subWeeks(4)->startOfDay()->toDateString();
        $to = now()->toDateString();

        $offeringIds = Enrollment::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->where('status', EnrollmentStatus::Active)
            ->pluck('class_offering_id')
            ->unique()
            ->values();

        $offerings = ClassOffering::query()
            ->with('schedules')
            ->whereIn('id', $offeringIds)
            ->get();

        $sessionsByOffering = [];

        foreach ($offerings as $offering) {
            if ($offering->schedules->isEmpty()) {
                continue;
            }
            try {
                $result = $generator->generateSessions($offering, $from, $to);
                $sessions = collect($result['sessions'])
                    ->filter(fn (ClassSession $s) => $s->session_date?->lte(now()))
                    ->sortBy(fn (ClassSession $s) => $s->session_date?->toDateString().' '.$s->start_time)
                    ->values();
                $sessionsByOffering[$offering->id] = $sessions;
                $this->sessionsGenerated += $sessions->count();
            } catch (\Throwable $e) {
                $this->command?->warn("تخطي توليد جلسات الشعبة #{$offering->id}: ".$e->getMessage());
            }
        }

        // Attendance profiles by student index among active enrollments.
        $chronicIds = $students->take(2)->pluck('id')->all();
        $excellentIds = $students->slice(2, 15)->pluck('id')->all();

        foreach ($sessionsByOffering as $offeringId => $sessions) {
            $enrolled = Enrollment::query()
                ->where('class_offering_id', $offeringId)
                ->where('status', EnrollmentStatus::Active)
                ->whereIn('student_id', $students->pluck('id'))
                ->pluck('student_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($enrolled === [] || $sessions->isEmpty()) {
                continue;
            }

            $sessionList = $sessions->values();
            $total = $sessionList->count();

            foreach ($sessionList as $idx => $session) {
                $records = [];
                foreach ($enrolled as $studentId) {
                    $status = $this->attendanceStatusFor(
                        $studentId,
                        $idx,
                        $total,
                        $chronicIds,
                        $excellentIds,
                    );
                    $records[] = [
                        'student_id' => $studentId,
                        'status' => $status->value,
                        'notes' => $status === AttendanceStatus::Absent ? 'غياب (بيانات تجريبية)' : null,
                    ];
                }

                try {
                    $saved = $attendance->markAttendance($session, $records, $admin->id, $admin);
                    $this->attendanceMarked += $saved->count();
                } catch (\Throwable $e) {
                    // Admin bypasses teacher scope; still guard against validation noise.
                    $this->command?->warn("حضور جلسة #{$session->id}: ".$e->getMessage());
                }
            }
        }
    }

    /**
     * @param  list<int>  $chronicIds
     * @param  list<int>  $excellentIds
     */
    private function attendanceStatusFor(
        int $studentId,
        int $sessionIndex,
        int $totalSessions,
        array $chronicIds,
        array $excellentIds,
    ): AttendanceStatus {
        if (in_array($studentId, $chronicIds, true)) {
            // Present early, then consecutive absences at the end to trigger alerts.
            $absentFrom = max(0, $totalSessions - 4);

            return $sessionIndex >= $absentFrom
                ? AttendanceStatus::Absent
                : AttendanceStatus::Present;
        }

        if (in_array($studentId, $excellentIds, true)) {
            return ($sessionIndex % 12 === 0)
                ? AttendanceStatus::Late
                : AttendanceStatus::Present;
        }

        // Average ~70% present
        $roll = ($studentId + $sessionIndex * 7) % 10;

        return match (true) {
            $roll <= 6 => AttendanceStatus::Present,
            $roll === 7 => AttendanceStatus::Late,
            $roll === 8 => AttendanceStatus::Excused,
            default => AttendanceStatus::Absent,
        };
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Student>  $students
     */
    private function seedEvaluationsAndExams($students, User $teacher, User $admin): void
    {
        $examService = app(ExamService::class);

        $sample = $students->filter(function (Student $s) {
            return Enrollment::query()
                ->where('student_id', $s->id)
                ->where('status', EnrollmentStatus::Active)
                ->exists();
        })->values();

        // ~40% get evaluations
        $toEvaluate = $sample->take((int) max(1, floor($sample->count() * 0.4)));

        foreach ($toEvaluate as $i => $student) {
            $enrollment = Enrollment::query()
                ->where('student_id', $student->id)
                ->where('status', EnrollmentStatus::Active)
                ->with('classOffering')
                ->first();

            if (! $enrollment) {
                continue;
            }

            Evaluation::query()->create([
                'student_id' => $student->id,
                'class_offering_id' => $enrollment->class_offering_id,
                'numeric_score' => 6 + ($i % 5) + 0.5,
                'numeric_score_max' => 10,
                'level_rating' => $i % 3 === 0 ? EvaluationLevelRating::Excellent : EvaluationLevelRating::Good,
                'participation_rating' => 3 + ($i % 3),
                'understanding_rating' => 3 + (($i + 1) % 3),
                'homework_rating' => 2 + ($i % 4),
                'discipline_rating' => 4,
                'note' => self::MARKER.' ملاحظة تقييم تجريبية',
                'created_by' => $teacher->id,
            ]);
            $this->evaluationsCreated++;
        }

        $offeringsWithStudents = Enrollment::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->where('status', EnrollmentStatus::Active)
            ->select('class_offering_id')
            ->groupBy('class_offering_id')
            ->havingRaw('COUNT(*) >= 3')
            ->orderBy('class_offering_id')
            ->limit(2)
            ->pluck('class_offering_id');

        $periodId = Plan::query()->whereNotNull('period_id')->value('period_id');

        foreach ($offeringsWithStudents as $offeringId) {
            $offering = ClassOffering::query()->with('subject')->find($offeringId);
            if (! $offering || ! $periodId) {
                continue;
            }

            $exam = Exam::query()->create([
                'name' => self::MARKER.' اختبار قصير — '.($offering->subject?->name ?? 'مادة'),
                'exam_date' => now()->subDays(5)->toDateString(),
                'class_offering_id' => $offering->id,
                'max_score' => 20,
                'period_id' => $periodId,
                'created_by' => $admin->id,
            ]);
            $this->examsCreated++;

            $rosterStudents = Enrollment::query()
                ->where('class_offering_id', $offering->id)
                ->where('status', EnrollmentStatus::Active)
                ->whereIn('student_id', $students->pluck('id'))
                ->pluck('student_id');

            $results = [];
            foreach ($rosterStudents as $j => $sid) {
                $results[] = [
                    'student_id' => (int) $sid,
                    'score' => $j % 7 === 0 ? null : round(10 + ($j % 11), 1),
                    'teacher_notes' => $j % 7 === 0 ? 'تغيّب' : null,
                ];
            }

            try {
                $examService->recordResults($exam, $results, $admin);
            } catch (\Throwable $e) {
                $this->command?->warn('نتائج اختبار: '.$e->getMessage());
            }
        }
    }
}
