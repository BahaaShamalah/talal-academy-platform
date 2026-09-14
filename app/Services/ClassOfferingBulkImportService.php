<?php

namespace App\Services;

use App\Enums\ClassOfferingStatus;
use App\Models\ClassOffering;
use App\Models\ClassSchedule;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ClassOfferingBulkImportService
{
    public function __construct(
        private readonly AcademicPeriodService $academicPeriodService,
        private readonly ClassScheduleService $classScheduleService,
        private readonly GradeSectionService $gradeSectionService,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{success: bool, offering_id?: int, error?: string}>
     */
    public function import(array $rows, bool $forceAll = false): array
    {
        $periodId = $this->academicPeriodService->currentActive()?->id;
        $results = [];

        foreach ($rows as $row) {
            $results[] = $this->importRow($row, $periodId, $forceAll);
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{success: bool, offering_id?: int, error?: string}
     */
    private function importRow(array $row, ?int $periodId, bool $forceAll): array
    {
        try {
            return DB::transaction(function () use ($row, $periodId, $forceAll) {
                $gradeId = (int) $row['grade_id'];
                $subjectId = (int) $row['subject_id'];
                $teacherId = (int) $row['teacher_id'];
                $hallId = (int) $row['hall_id'];
                $gender = $row['gender'];

                if (! $this->gradeSubjectLinked($gradeId, $subjectId)) {
                    throw new RuntimeException('المادة غير مرتبطة بهذا الصف الدراسي.');
                }

                $schedules = $row['schedules'] ?? [];
                if ($schedules === []) {
                    throw new RuntimeException('يجب إضافة موعد أسبوعي واحد على الأقل.');
                }

                foreach ($schedules as $schedule) {
                    $this->assertValidScheduleTimes(
                        (string) $schedule['start_time'],
                        (string) $schedule['end_time'],
                    );
                }

                $sectionId = $this->gradeSectionService->resolveForImport($row, $periodId);

                // One offering per (grade, subject, teacher, gender, section, period).
                // Extra weekly days become schedules on the same offering — not new offerings.
                $offeringQuery = ClassOffering::query()
                    ->where('grade_id', $gradeId)
                    ->where('subject_id', $subjectId)
                    ->where('teacher_id', $teacherId)
                    ->where('gender', $gender)
                    ->where('period_id', $periodId);

                if ($sectionId) {
                    $offeringQuery->where('grade_section_id', $sectionId);
                } else {
                    $offeringQuery->whereNull('grade_section_id');
                }

                $offering = $offeringQuery->first();

                if ($offering) {
                    $offering->update([
                        'hall_id' => $hallId,
                        'status' => ClassOfferingStatus::Active,
                    ]);
                } else {
                    $offering = ClassOffering::query()->create([
                        'grade_id' => $gradeId,
                        'grade_section_id' => $sectionId,
                        'subject_id' => $subjectId,
                        'teacher_id' => $teacherId,
                        'hall_id' => $hallId,
                        'gender' => $gender,
                        'period_id' => $periodId,
                        'status' => ClassOfferingStatus::Active,
                    ]);
                }

                foreach ($schedules as $schedule) {
                    $day = (int) $schedule['day_of_week'];
                    $start = $this->normalizeTime((string) $schedule['start_time']);
                    $end = $this->normalizeTime((string) $schedule['end_time']);

                    $exists = ClassSchedule::query()
                        ->where('class_offering_id', $offering->id)
                        ->where('day_of_week', $day)
                        ->get()
                        ->contains(function (ClassSchedule $s) use ($start, $end) {
                            return substr((string) $s->start_time, 0, 5) === $start
                                && substr((string) $s->end_time, 0, 5) === $end;
                        });

                    if ($exists) {
                        continue;
                    }

                    $result = $this->classScheduleService->create([
                        'class_offering_id' => $offering->id,
                        'day_of_week' => $day,
                        'start_time' => $start,
                        'end_time' => $end,
                    ], $forceAll);

                    if ($result['blocked']) {
                        $messages = collect($result['conflicts'])
                            ->pluck('message')
                            ->filter()
                            ->unique()
                            ->values()
                            ->all();

                        throw new RuntimeException(
                            'تعارض في الجدول: '.($messages !== [] ? implode('؛ ', $messages) : 'تعارض مع جدول آخر.')
                        );
                    }
                }

                app(AutoEnrollmentService::class)->retryWaitingStudents(
                    $offering->fresh(['schedules'])
                );

                return [
                    'success' => true,
                    'offering_id' => $offering->id,
                ];
            });
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function gradeSubjectLinked(int $gradeId, int $subjectId): bool
    {
        return DB::table('grade_subjects')
            ->where('grade_id', $gradeId)
            ->where('subject_id', $subjectId)
            ->exists();
    }

    private function assertValidScheduleTimes(string $start, string $end): void
    {
        $start = $this->normalizeTime($start);
        $end = $this->normalizeTime($end);

        if ($start >= $end) {
            throw new RuntimeException('وقت النهاية يجب أن يكون بعد وقت البداية.');
        }
    }

    private function normalizeTime(string $time): string
    {
        return substr($time, 0, 5);
    }
}
