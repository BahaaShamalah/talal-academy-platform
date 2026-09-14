<?php

namespace App\Services;

use App\Enums\ClassOfferingStatus;
use App\Models\AbsenceAlert;
use App\Models\ClassOffering;
use App\Models\ClassSchedule;
use App\Models\ClassSession;
use App\Models\EducationalMaterial;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Exam;
use Illuminate\Support\Facades\DB;

class ClassOfferingDedupeService
{
    /**
     * Merge offerings that share the same teaching identity into one,
     * keeping the oldest id and attaching all weekly schedules to it.
     *
     * Identity: grade + subject + teacher + gender + section + period
     *
     * @return array{groups: int, merged: int, kept: int}
     */
    public function mergeDuplicates(bool $dryRun = false): array
    {
        $offerings = ClassOffering::query()
            ->orderBy('id')
            ->get(['id', 'grade_id', 'subject_id', 'teacher_id', 'gender', 'grade_section_id', 'period_id', 'hall_id', 'status']);

        $groups = $offerings->groupBy(function (ClassOffering $o) {
            return implode('|', [
                (string) $o->grade_id,
                (string) $o->subject_id,
                (string) $o->teacher_id,
                (string) ($o->gender?->value ?? $o->gender ?? ''),
                (string) ($o->grade_section_id ?? 'null'),
                (string) ($o->period_id ?? 'null'),
            ]);
        })->filter(fn ($g) => $g->count() > 1);

        $merged = 0;
        $kept = 0;

        foreach ($groups as $group) {
            $canonical = $group->first();
            $duplicates = $group->slice(1);
            $kept++;

            if ($dryRun) {
                $merged += $duplicates->count();

                continue;
            }

            DB::transaction(function () use ($canonical, $duplicates, &$merged) {
                foreach ($duplicates as $duplicate) {
                    $this->absorb($canonical, $duplicate);
                    $merged++;
                }
            });
        }

        return [
            'groups' => $groups->count(),
            'merged' => $merged,
            'kept' => $kept,
        ];
    }

    private function absorb(ClassOffering $canonical, ClassOffering $duplicate): void
    {
        $canonicalId = (int) $canonical->id;
        $duplicateId = (int) $duplicate->id;

        // Move schedules (skip exact day+time duplicates).
        $existingKeys = ClassSchedule::query()
            ->where('class_offering_id', $canonicalId)
            ->get(['day_of_week', 'start_time', 'end_time'])
            ->map(fn (ClassSchedule $s) => $this->scheduleKey($s))
            ->all();
        $existingLookup = array_flip($existingKeys);

        $schedules = ClassSchedule::query()->where('class_offering_id', $duplicateId)->get();
        foreach ($schedules as $schedule) {
            $key = $this->scheduleKey($schedule);
            if (isset($existingLookup[$key])) {
                // Repoint sessions that used the duplicate schedule to the canonical twin.
                $canonicalScheduleId = ClassSchedule::query()
                    ->where('class_offering_id', $canonicalId)
                    ->where('day_of_week', $schedule->day_of_week)
                    ->where('start_time', $schedule->start_time)
                    ->where('end_time', $schedule->end_time)
                    ->value('id');

                if ($canonicalScheduleId) {
                    ClassSession::query()
                        ->where('class_schedule_id', $schedule->id)
                        ->update([
                            'class_offering_id' => $canonicalId,
                            'class_schedule_id' => $canonicalScheduleId,
                        ]);
                }
                $schedule->delete();

                continue;
            }

            $schedule->update(['class_offering_id' => $canonicalId]);
            $existingLookup[$key] = true;
        }

        // Enrollments: keep one per student on canonical.
        $canonicalStudentIds = Enrollment::query()
            ->where('class_offering_id', $canonicalId)
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $canonicalLookup = array_flip($canonicalStudentIds);

        $dupEnrollments = Enrollment::query()->where('class_offering_id', $duplicateId)->get();
        foreach ($dupEnrollments as $enrollment) {
            $studentId = (int) $enrollment->student_id;
            if (isset($canonicalLookup[$studentId])) {
                $enrollment->delete();

                continue;
            }
            $enrollment->update(['class_offering_id' => $canonicalId]);
            $canonicalLookup[$studentId] = true;
        }

        ClassSession::query()
            ->where('class_offering_id', $duplicateId)
            ->update(['class_offering_id' => $canonicalId]);

        Evaluation::query()
            ->where('class_offering_id', $duplicateId)
            ->update(['class_offering_id' => $canonicalId]);

        Exam::query()
            ->where('class_offering_id', $duplicateId)
            ->update(['class_offering_id' => $canonicalId]);

        EducationalMaterial::query()
            ->where('class_offering_id', $duplicateId)
            ->update(['class_offering_id' => $canonicalId]);

        AbsenceAlert::query()
            ->where('class_offering_id', $duplicateId)
            ->update(['class_offering_id' => $canonicalId]);

        // Prefer keeping an active status / more recent hall if canonical empty.
        if ($duplicate->hall_id && ! $canonical->hall_id) {
            $canonical->update(['hall_id' => $duplicate->hall_id]);
        }
        if ($duplicate->status === ClassOfferingStatus::Active) {
            $canonical->update(['status' => ClassOfferingStatus::Active]);
        }

        $duplicate->delete();
    }

    private function scheduleKey(ClassSchedule $schedule): string
    {
        $start = substr((string) $schedule->start_time, 0, 5);
        $end = substr((string) $schedule->end_time, 0, 5);

        return ((int) $schedule->day_of_week).'|'.$start.'|'.$end;
    }
}
