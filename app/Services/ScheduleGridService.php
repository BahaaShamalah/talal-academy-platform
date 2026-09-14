<?php

namespace App\Services;

use App\Enums\ClassOfferingStatus;
use App\Models\ClassOffering;
use App\Models\Grade;
use App\Models\GradeSection;
use App\Models\Subject;
use App\Support\TimeFormatter;
use Illuminate\Support\Collection;

class ScheduleGridService
{
    /** @var array<string, int> */
    private const DAY_KEYS = [
        'saturday' => 6,
        'sunday' => 0,
        'monday' => 1,
        'tuesday' => 2,
        'wednesday' => 3,
    ];

    public function __construct(
        private readonly AcademicPeriodService $academicPeriodService,
    ) {}

    /**
     * @param  array{gender?: string|null, period_id?: int|null, grade_id?: int|null, grade_section_id?: int|null, subject_id?: int|null}  $filters
     * @return array{
     *     gender: string|null,
     *     gender_label: string|null,
     *     period_id: int|null,
     *     period_name: string|null,
     *     title: string,
     *     subtitle: string|null,
     *     day_columns: list<array{key: string, label: string}>,
     *     grades: list<array{grade_id: int, grade_name: string, stage_name: string|null, grade_section_id: int|null, grade_section_name: string|null, grade_section_gender: string|null, timeslots: list<...>}>
     * }
     */
    public function build(array $filters): array
    {
        $periodId = ! empty($filters['period_id'])
            ? (int) $filters['period_id']
            : $this->academicPeriodService->currentActive()?->id;

        $gender = ! empty($filters['gender']) && in_array($filters['gender'], ['male', 'female'], true)
            ? $filters['gender']
            : null;

        $offerings = ClassOffering::query()
            ->with([
                'grade.educationalStage',
                'gradeSection',
                'subject',
                'schedules',
                'period',
            ])
            ->where('status', ClassOfferingStatus::Active)
            ->when($periodId, function ($q) use ($periodId) {
                $q->where(function ($q2) use ($periodId) {
                    $q2->where('period_id', $periodId)->orWhereNull('period_id');
                });
            })
            ->when($gender, fn ($q) => $q->where('gender', $gender))
            ->when(! empty($filters['grade_id']), fn ($q) => $q->where('grade_id', (int) $filters['grade_id']))
            ->when(! empty($filters['educational_stage_id']), function ($q) use ($filters): void {
                $q->whereHas(
                    'grade',
                    fn ($g) => $g->where('educational_stage_id', (int) $filters['educational_stage_id']),
                );
            })
            ->when(
                array_key_exists('grade_section_id', $filters) && $filters['grade_section_id'] !== null && $filters['grade_section_id'] !== '',
                function ($q) use ($filters) {
                    $sectionFilter = $filters['grade_section_id'];
                    if ($sectionFilter === 'none' || $sectionFilter === 'null') {
                        $q->whereNull('grade_section_id');
                    } else {
                        $q->where('grade_section_id', (int) $sectionFilter);
                    }
                },
            )
            ->when(! empty($filters['subject_id']), fn ($q) => $q->where('subject_id', (int) $filters['subject_id']))
            ->get();

        $periodName = $offerings->first()?->period?->name
            ?? ($periodId ? $this->academicPeriodService->currentActive()?->name : null);

        $grade = ! empty($filters['grade_id'])
            ? Grade::query()->with('educationalStage')->find((int) $filters['grade_id'])
            : null;
        $subject = ! empty($filters['subject_id'])
            ? Subject::query()->find((int) $filters['subject_id'])
            : null;

        $dayColumns = $this->dayColumns();

        $grades = $offerings
            ->groupBy(fn (ClassOffering $offering) => $offering->grade_id.'|'.($offering->grade_section_id ?? 'none'))
            ->map(fn (Collection $sectionOfferings) => $this->buildSectionGrid(
                $sectionOfferings,
                $dayColumns,
            ))
            ->keyBy(fn (array $grid) => $grid['grade_id'].'|'.($grid['grade_section_id'] ?? 'none'));

        $existingKeys = $grades->keys()->flip();

        $this->matchingSections($filters, $periodId, $gender)
            ->each(function (GradeSection $section) use ($grades, $existingKeys, $dayColumns): void {
                $key = $section->grade_id.'|'.$section->id;
                if ($existingKeys->has($key)) {
                    return;
                }
                $grades->put($key, $this->buildEmptySectionGrid($section, $dayColumns));
            });

        $grades = $grades
            ->sortBy([
                fn (array $a, array $b) => ($a['stage_order'] ?? 0) <=> ($b['stage_order'] ?? 0),
                fn (array $a, array $b) => ($a['grade_order'] ?? 0) <=> ($b['grade_order'] ?? 0),
                fn (array $a, array $b) => strcmp($a['grade_name'], $b['grade_name']),
                fn (array $a, array $b) => strcmp($a['grade_section_name'] ?? '', $b['grade_section_name'] ?? ''),
            ])
            ->values()
            ->map(fn (array $grid) => collect($grid)->except(['stage_order', 'grade_order'])->all())
            ->all();

        $conflicts = $this->collectConflicts($grades);

        return [
            'gender' => $gender,
            'gender_label' => $this->genderLabel($gender),
            'period_id' => $periodId,
            'period_name' => $periodName,
            'title' => $this->resolveTitle($grade, $subject),
            'subtitle' => $this->resolveSubtitle($grade, $subject, $gender),
            'day_columns' => $dayColumns,
            'grades' => $grades,
            'has_conflicts' => $conflicts !== [],
            'conflicts' => $conflicts,
            'notes' => $conflicts === []
                ? ['لا يوجد تعارضات في الجدول.']
                : array_map(fn (array $c) => $c['message'], $conflicts),
        ];
    }

    /**
     * @param  Collection<int, ClassOffering>  $sectionOfferings
     * @param  list<array{key: string, label: string}>  $dayColumns
     * @return array<string, mixed>
     */
    private function buildSectionGrid(Collection $sectionOfferings, array $dayColumns): array
    {
        /** @var ClassOffering $sample */
        $sample = $sectionOfferings->first();
        $grade = $sample->grade;
        $section = $sample->gradeSection;

        /** @var array<string, array{start: string, end: string}> $timeslotDefs */
        $timeslotDefs = [];
        /** @var array<string, array<string, list<string>>> $cells */
        $cells = [];

        foreach ($sectionOfferings as $offering) {
            $subjectName = $offering->subject?->name ?? 'مادة';

            foreach ($offering->schedules as $schedule) {
                $dayKey = $this->dayKeyFor((int) $schedule->day_of_week);
                if ($dayKey === null) {
                    continue;
                }

                $start = $this->normalizeTime((string) $schedule->start_time);
                $end = $this->normalizeTime((string) $schedule->end_time);
                $slotKey = $this->timeslotKey($start, $end);

                $timeslotDefs[$slotKey] = ['start' => $start, 'end' => $end];
                $cells[$slotKey][$dayKey][] = $subjectName;
            }
        }

        uasort($timeslotDefs, fn (array $a, array $b) => $this->compareTimeslots($a, $b));

        $timeslots = [];
        foreach ($timeslotDefs as $slotKey => $def) {
            $days = [];
            foreach ($dayColumns as $column) {
                $key = $column['key'];
                $subjects = $cells[$slotKey][$key] ?? [];
                $unique = array_values(array_unique(array_filter($subjects)));
                $days[$key] = $unique === [] ? null : implode('، ', $unique);
            }

            $timeslots[] = [
                'time_range' => TimeFormatter::range($def['start'], $def['end']),
                'start_time' => $def['start'],
                'end_time' => $def['end'],
                'days' => $days,
            ];
        }

        return [
            'grade_id' => (int) $sample->grade_id,
            'grade_name' => $grade?->name ?? 'صف',
            'stage_name' => $grade?->educationalStage?->name,
            'grade_section_id' => $section?->id,
            'grade_section_name' => $this->sectionDisplayName($section),
            'grade_section_gender' => $section?->gender?->value,
            'stage_order' => $grade?->educationalStage?->order ?? 0,
            'grade_order' => $grade?->order ?? 0,
            'timeslots' => $timeslots,
        ];
    }

    /**
     * @param  list<array{key: string, label: string}>  $dayColumns
     * @return array<string, mixed>
     */
    private function buildEmptySectionGrid(GradeSection $section, array $dayColumns): array
    {
        $grade = $section->grade;

        return [
            'grade_id' => (int) $section->grade_id,
            'grade_name' => $grade?->name ?? 'صف',
            'stage_name' => $grade?->educationalStage?->name,
            'grade_section_id' => $section->id,
            'grade_section_name' => $this->sectionDisplayName($section),
            'grade_section_gender' => $section->gender?->value,
            'stage_order' => $grade?->educationalStage?->order ?? 0,
            'grade_order' => $grade?->order ?? 0,
            'timeslots' => [],
        ];
    }

    private function sectionDisplayName(?GradeSection $section): string
    {
        if ($section === null) {
            return 'بدون شعبة';
        }

        $name = $section->name;

        if ($section->gender !== null) {
            $name .= ' — '.($section->gender->value === 'male' ? 'ذكور' : 'إناث');
        }

        return $name;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, GradeSection>
     */
    private function matchingSections(array $filters, ?int $periodId, ?string $gender): Collection
    {
        return GradeSection::query()
            ->with('grade.educationalStage')
            ->where('status', ClassOfferingStatus::Active)
            ->when(
                $periodId,
                fn ($q) => $q->where(function ($q2) use ($periodId) {
                    $q2->where('period_id', $periodId)->orWhereNull('period_id');
                }),
            )
            ->when(
                $gender,
                fn ($q) => $q->where(function ($q2) use ($gender) {
                    $q2->where('gender', $gender)->orWhereNull('gender');
                }),
            )
            ->when(! empty($filters['grade_id']), fn ($q) => $q->where('grade_id', (int) $filters['grade_id']))
            ->when(! empty($filters['educational_stage_id']), function ($q) use ($filters): void {
                $q->whereHas(
                    'grade',
                    fn ($g) => $g->where('educational_stage_id', (int) $filters['educational_stage_id']),
                );
            })
            ->when(
                array_key_exists('grade_section_id', $filters) && $filters['grade_section_id'] !== null && $filters['grade_section_id'] !== '',
                function ($q) use ($filters) {
                    $sectionFilter = $filters['grade_section_id'];
                    if ($sectionFilter === 'none' || $sectionFilter === 'null') {
                        $q->whereRaw('1 = 0');
                    } else {
                        $q->where('id', (int) $sectionFilter);
                    }
                },
            )
            ->orderBy('name')
            ->get();
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    private function dayColumns(): array
    {
        return [
            ['key' => 'saturday', 'label' => 'السبت'],
            ['key' => 'sunday', 'label' => 'الأحد'],
            ['key' => 'monday', 'label' => 'الإثنين'],
            ['key' => 'tuesday', 'label' => 'الثلاثاء'],
            ['key' => 'wednesday', 'label' => 'الأربعاء'],
        ];
    }

    private function dayKeyFor(int $dayOfWeek): ?string
    {
        foreach (self::DAY_KEYS as $key => $id) {
            if ($id === $dayOfWeek) {
                return $key;
            }
        }

        return null;
    }

    private function timeslotKey(string $start, string $end): string
    {
        return $start.'|'.$end;
    }

    /**
     * @param  array{start: string, end: string}  $a
     * @param  array{start: string, end: string}  $b
     */
    private function compareTimeslots(array $a, array $b): int
    {
        $startCmp = strcmp($a['start'], $b['start']);
        if ($startCmp !== 0) {
            return $startCmp;
        }

        return strcmp($a['end'], $b['end']);
    }

    private function normalizeTime(string $time): string
    {
        return substr($time, 0, 5);
    }

    /**
     * @param  list<array<string, mixed>>  $grades
     * @return list<array{grade_name: string, grade_section_name: string|null, time_range: string, day_label: string, message: string}>
     */
    private function collectConflicts(array $grades): array
    {
        $dayLabels = collect($this->dayColumns())->keyBy('key');
        $conflicts = [];

        foreach ($grades as $grade) {
            $sectionLabel = $grade['grade_section_name'] ?? 'بدون شعبة';
            $unitLabel = ($grade['grade_name'] ?? 'صف').' — '.$sectionLabel;

            foreach ($grade['timeslots'] ?? [] as $slot) {
                foreach ($slot['days'] ?? [] as $dayKey => $value) {
                    if (! is_string($value) || ! str_contains($value, '،')) {
                        continue;
                    }

                    $dayLabel = $dayLabels[$dayKey]['label'] ?? $dayKey;
                    $conflicts[] = [
                        'grade_name' => $grade['grade_name'] ?? 'صف',
                        'grade_section_name' => $sectionLabel,
                        'time_range' => $slot['time_range'] ?? '',
                        'day_label' => $dayLabel,
                        'message' => sprintf(
                            'تعارض في %s — %s %s: %s',
                            $unitLabel,
                            $dayLabel,
                            $slot['time_range'] ?? '',
                            $value,
                        ),
                    ];
                }
            }
        }

        return $conflicts;
    }

    private function resolveTitle(?Grade $grade, ?Subject $subject): string
    {
        if ($grade && $subject) {
            return "جدول {$grade->name} — {$subject->name}";
        }

        if ($grade) {
            return "جدول {$grade->name}";
        }

        if ($subject) {
            return "جدول {$subject->name}";
        }

        return 'الجدول الدراسي';
    }

    private function resolveSubtitle(?Grade $grade, ?Subject $subject, ?string $gender): ?string
    {
        $parts = [];

        if ($grade?->educationalStage?->name) {
            $parts[] = $grade->educationalStage->name;
        }

        if ($gender === 'male') {
            $parts[] = 'قسم الذكور';
        } elseif ($gender === 'female') {
            $parts[] = 'قسم الإناث';
        }

        return $parts === [] ? null : implode(' · ', $parts);
    }

    private function genderLabel(?string $gender): ?string
    {
        return match ($gender) {
            'male' => 'ذكور',
            'female' => 'إناث',
            default => null,
        };
    }
}
