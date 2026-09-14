<?php

namespace App\Services;

use App\Enums\ClassOfferingStatus;
use App\Enums\Gender;
use App\Support\TimeFormatter;
use App\Models\ClassOffering;
use App\Models\Grade;
use App\Models\Subject;

class ScheduleExportService
{
    public function __construct(
        private readonly AcademicPeriodService $academicPeriodService,
    ) {}

    /**
     * @param  array{grade_id?: int|null, subject_id?: int|null, gender?: string|null, period_id?: int|null}  $filters
     * @return array{
     *     rows: list<array<string, mixed>>,
     *     title: string,
     *     subtitle: string|null,
     *     period_name: string|null,
     *     filters: array<string, mixed>
     * }
     */
    public function build(array $filters): array
    {
        $periodId = ! empty($filters['period_id'])
            ? (int) $filters['period_id']
            : $this->academicPeriodService->currentActive()?->id;

        $query = ClassOffering::query()
            ->with([
                'grade.educationalStage',
                'subject',
                'teacher',
                'hall',
                'period',
                'schedules',
            ])
            ->where('status', ClassOfferingStatus::Active)
            ->when($periodId, function ($q) use ($periodId) {
                $q->where(function ($q2) use ($periodId) {
                    $q2->where('period_id', $periodId)->orWhereNull('period_id');
                });
            })
            ->when(! empty($filters['grade_id']), fn ($q) => $q->where('grade_id', (int) $filters['grade_id']))
            ->when(! empty($filters['subject_id']), fn ($q) => $q->where('subject_id', (int) $filters['subject_id']))
            ->when(
                ! empty($filters['gender']) && in_array($filters['gender'], ['male', 'female'], true),
                fn ($q) => $q->where('gender', $filters['gender']),
            );

        $offerings = $query->get();

        $rows = $offerings
            ->flatMap(function (ClassOffering $offering) {
                $schedules = $offering->schedules ?? collect();

                if ($schedules->isEmpty()) {
                    return collect([$this->rowFromOffering($offering, null)]);
                }

                return $schedules->map(fn ($schedule) => $this->rowFromOffering($offering, $schedule));
            })
            ->sortBy([
                ['day_of_week', 'asc'],
                ['start_sort', 'asc'],
                ['grade_name', 'asc'],
                ['subject_name', 'asc'],
            ])
            ->values()
            ->map(fn (array $row) => collect($row)->except(['start_sort'])->all())
            ->all();

        $grade = ! empty($filters['grade_id'])
            ? Grade::query()->with('educationalStage')->find((int) $filters['grade_id'])
            : null;
        $subject = ! empty($filters['subject_id'])
            ? Subject::query()->find((int) $filters['subject_id'])
            : null;

        $periodName = $offerings->first()?->period?->name
            ?? ($periodId ? $this->academicPeriodService->currentActive()?->name : null);

        return [
            'rows' => $rows,
            'title' => $this->resolveTitle($grade, $subject),
            'subtitle' => $this->resolveSubtitle($grade, $subject, $filters['gender'] ?? null),
            'period_name' => $periodName,
            'filters' => [
                'grade_id' => $filters['grade_id'] ?? null,
                'subject_id' => $filters['subject_id'] ?? null,
                'gender' => $filters['gender'] ?? null,
                'period_id' => $periodId,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rowFromOffering(ClassOffering $offering, ?object $schedule): array
    {
        $start = $schedule ? TimeFormatter::to12Hour($schedule->start_time) : '—';
        $end = $schedule ? TimeFormatter::to12Hour($schedule->end_time) : '—';

        return [
            'day_of_week' => $schedule?->day_of_week,
            'day_label' => $schedule ? $this->weekdayLabel((int) $schedule->day_of_week) : '—',
            'time_label' => $schedule ? "{$start} – {$end}" : '—',
            'start_sort' => $schedule ? $this->timeToMinutes($start) : 9999,
            'grade_name' => $offering->grade?->name ?? '—',
            'stage_name' => $offering->grade?->educationalStage?->name,
            'subject_name' => $offering->subject?->name ?? '—',
            'teacher_name' => $offering->teacher?->name ?? '—',
            'hall_name' => $offering->hall?->name ?? '—',
            'gender' => $offering->gender?->value,
            'gender_label' => $this->genderLabel($offering->gender),
        ];
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

        return 'الجدول العام';
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

    private function genderLabel(?Gender $gender): string
    {
        return match ($gender) {
            Gender::Male => 'ذكور',
            Gender::Female => 'إناث',
            default => 'غير محدد',
        };
    }

    private function weekdayLabel(int $day): string
    {
        return match ($day) {
            0 => 'الأحد',
            1 => 'الإثنين',
            2 => 'الثلاثاء',
            3 => 'الأربعاء',
            4 => 'الخميس',
            5 => 'الجمعة',
            6 => 'السبت',
            default => '—',
        };
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);

        return ((int) ($parts[0] ?? 0) * 60) + (int) ($parts[1] ?? 0);
    }
}
