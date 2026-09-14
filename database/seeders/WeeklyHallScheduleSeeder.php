<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Enums\ClassOfferingStatus;
use App\Models\AcademicPeriod;
use App\Models\Branch;
use App\Models\ClassOffering;
use App\Models\ClassSchedule;
use App\Models\ClassSession;
use App\Models\Grade;
use App\Models\Hall;
use App\Models\User;
use App\Services\SessionGeneratorService;
use Illuminate\Database\Seeder;

/**
 * يضمن 4 قاعات فقط، ويملأ جداول كل عروض المواد
 * على مدار الأسبوع ما عدا الجمعة — فترة صباحية + مسائية.
 *
 *   php artisan db:seed --class=WeeklyHallScheduleSeeder
 */
class WeeklyHallScheduleSeeder extends Seeder
{
    /** أيام الدراسة: سبت…خميس (بدون جمعة = 5) */
    private const DAYS = [6, 0, 1, 2, 3, 4];

    /** @var list<array{start: string, end: string, period: string}> */
    private const SLOTS = [
        ['start' => '09:00', 'end' => '10:30', 'period' => 'morning'],
        ['start' => '10:45', 'end' => '12:15', 'period' => 'morning'],
        ['start' => '16:00', 'end' => '17:30', 'period' => 'evening'],
        ['start' => '17:45', 'end' => '19:15', 'period' => 'evening'],
    ];

    public function run(): void
    {
        $branch = Branch::query()->orderBy('id')->first();
        if (! $branch) {
            $this->command?->error('لا يوجد فرع — شغّل AcademicStructureSeeder أولًا.');

            return;
        }

        $halls = $this->ensureFourHalls($branch);
        $teachers = $this->ensureFourTeachers();
        $offerings = $this->ensureOfferingsForAllSubjects($halls, $teachers);

        $this->command?->info('إعادة بناء الجداول الأسبوعية (سبت–خميس، صباحي/مسائي)…');
        $assigned = $this->rebuildSchedules($offerings, $halls, $teachers);

        $this->command?->info('تحديث جلسات المستقبل…');
        $sessions = $this->refreshUpcomingSessions($offerings);

        $this->command?->newLine();
        $this->command?->info('=== ملخص WeeklyHallScheduleSeeder ===');
        $this->command?->info('قاعات: '.$halls->pluck('name')->implode('، '));
        $this->command?->info('معلمون: '.$teachers->count());
        $this->command?->info('عروض مواد: '.$offerings->count());
        $this->command?->info("حصص أسبوعية مجدولة: {$assigned}");
        $this->command?->info("جلسات مولَّدة قادمة: {$sessions}");
    }

    /**
     * @return \Illuminate\Support\Collection<int, Hall>
     */
    private function ensureFourHalls(Branch $branch)
    {
        $names = ['قاعة أ', 'قاعة ب', 'قاعة ج', 'قاعة د'];
        $halls = collect();

        foreach ($names as $i => $name) {
            $hall = Hall::query()->firstOrCreate(
                ['branch_id' => $branch->id, 'name' => $name],
                ['capacity' => 25 + ($i * 5), 'order' => $i + 1],
            );
            $hall->update(['order' => $i + 1, 'capacity' => $hall->capacity ?: (25 + $i * 5)]);
            $halls->push($hall);
        }

        return $halls->values();
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function ensureFourTeachers()
    {
        $defs = [
            ['email' => 'teacher@example.com', 'name' => 'أ. محمد الرشيدي', 'phone' => '0500000001'],
            ['email' => 'teacher2@example.com', 'name' => 'أ. فاطمة العجمي', 'phone' => '0500000002'],
            ['email' => 'teacher3@example.com', 'name' => 'أ. يوسف المطيري', 'phone' => '0500000003'],
            ['email' => 'teacher4@example.com', 'name' => 'أ. نورة الصباح', 'phone' => '0500000004'],
        ];

        $teachers = collect();
        foreach ($defs as $def) {
            $user = User::query()->firstOrCreate(
                ['email' => $def['email']],
                [
                    'name' => $def['name'],
                    'phone' => $def['phone'],
                    'password' => 'password',
                    'is_teaching_staff' => true,
                ],
            );
            $user->forceFill([
                'name' => $def['name'],
                'is_teaching_staff' => true,
            ])->save();
            if (! $user->hasRole('teacher')) {
                $user->assignRole('teacher');
            }
            $teachers->push($user);
        }

        return $teachers->values();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Hall>  $halls
     * @param  \Illuminate\Support\Collection<int, User>  $teachers
     * @return \Illuminate\Support\Collection<int, ClassOffering>
     */
    private function ensureOfferingsForAllSubjects($halls, $teachers)
    {
        $offerings = collect();
        $teacherIdx = 0;
        $hallIdx = 0;

        $periodId = AcademicPeriod::query()
            ->where('status', AcademicPeriodStatus::Active)
            ->value('id');

        $grades = Grade::query()->with('subjects')->orderBy('order')->get();

        foreach ($grades as $grade) {
            foreach ($grade->subjects as $subject) {
                $offering = ClassOffering::query()
                    ->where('grade_id', $grade->id)
                    ->where('subject_id', $subject->id)
                    ->when($periodId, fn ($q) => $q->where('period_id', $periodId))
                    ->first();

                if (! $offering) {
                    $offering = ClassOffering::query()->create([
                        'grade_id' => $grade->id,
                        'subject_id' => $subject->id,
                        'teacher_id' => $teachers[$teacherIdx % $teachers->count()]->id,
                        'hall_id' => $halls[$hallIdx % $halls->count()]->id,
                        'period_id' => $periodId,
                        'status' => ClassOfferingStatus::Active,
                    ]);
                } else {
                    $offering->update([
                        'teacher_id' => $teachers[$teacherIdx % $teachers->count()]->id,
                        'hall_id' => $halls[$hallIdx % $halls->count()]->id,
                        'status' => ClassOfferingStatus::Active,
                    ]);
                }

                $teacherIdx++;
                $hallIdx++;
                $offerings->push($offering->fresh(['subject', 'grade', 'teacher', 'hall']));
            }
        }

        return $offerings->values();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ClassOffering>  $offerings
     * @param  \Illuminate\Support\Collection<int, Hall>  $halls
     * @param  \Illuminate\Support\Collection<int, User>  $teachers
     */
    private function rebuildSchedules($offerings, $halls, $teachers): int
    {
        ClassSchedule::query()
            ->whereIn('class_offering_id', $offerings->pluck('id'))
            ->delete();

        foreach ($offerings->values() as $index => $offering) {
            $offering->update([
                'hall_id' => $halls[$index % $halls->count()]->id,
                'teacher_id' => $teachers[$index % $teachers->count()]->id,
            ]);
        }
        $offerings = $offerings->map->fresh(['subject', 'hall', 'teacher', 'grade']);

        /** @var array<string, true> $used */
        $used = [];
        $created = 0;

        foreach ($offerings->values() as $index => $offering) {
            $preferEvening = $index % 2 === 1;
            $daysForOffering = [
                self::DAYS[$index % count(self::DAYS)],
                self::DAYS[($index + 2) % count(self::DAYS)],
                self::DAYS[($index + 4) % count(self::DAYS)],
            ];

            foreach ($daysForOffering as $day) {
                $slot = $this->firstFreeSlotForOffering($offering, $day, $preferEvening, $used);
                if (! $slot) {
                    $slot = $this->firstFreeSlotForOffering($offering, $day, ! $preferEvening, $used);
                }
                if (! $slot) {
                    continue;
                }

                ClassSchedule::query()->create([
                    'class_offering_id' => $offering->id,
                    'day_of_week' => $day,
                    'start_time' => $slot['start'],
                    'end_time' => $slot['end'],
                ]);

                $used[$this->key($day, $slot['start'], 'hall', (int) $offering->hall_id)] = true;
                $used[$this->key($day, $slot['start'], 'teacher', (int) $offering->teacher_id)] = true;
                $created++;
            }
        }

        return $created;
    }

    /**
     * @param  array<string, true>  $used
     * @return array{start: string, end: string, period: string}|null
     */
    private function firstFreeSlotForOffering(ClassOffering $offering, int $day, bool $preferEvening, array $used): ?array
    {
        $order = $preferEvening ? [2, 3, 0, 1] : [0, 1, 2, 3];

        foreach ($order as $i) {
            $slot = self::SLOTS[$i];
            $hallBusy = isset($used[$this->key($day, $slot['start'], 'hall', (int) $offering->hall_id)]);
            $teacherBusy = isset($used[$this->key($day, $slot['start'], 'teacher', (int) $offering->teacher_id)]);
            if (! $hallBusy && ! $teacherBusy) {
                return $slot;
            }
        }

        return null;
    }

    private function key(int $day, string $start, string $type, int $id): string
    {
        return "{$day}|{$start}|{$type}:{$id}";
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ClassOffering>  $offerings
     */
    private function refreshUpcomingSessions($offerings): int
    {
        $from = now()->toDateString();
        $to = now()->addWeeks(2)->toDateString();

        ClassSession::query()
            ->whereIn('class_offering_id', $offerings->pluck('id'))
            ->whereDate('session_date', '>=', $from)
            ->whereDoesntHave('attendanceRecords')
            ->delete();

        $generator = app(SessionGeneratorService::class);
        $total = 0;

        foreach ($offerings as $offering) {
            $offering->load('schedules');
            if ($offering->schedules->isEmpty()) {
                continue;
            }
            try {
                $result = $generator->generateSessions($offering, $from, $to);
                $total += (int) ($result['created'] ?? 0);
            } catch (\Throwable $e) {
                $this->command?->warn("تخطي توليد جلسات #{$offering->id}: ".$e->getMessage());
            }
        }

        return $total;
    }
}
