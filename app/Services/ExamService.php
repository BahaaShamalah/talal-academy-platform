<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class ExamService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly TeacherScopeService $teacherScopeService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Exam>
     */
    public function list(Request $request, ?User $actor = null): LengthAwarePaginator
    {
        $query = QueryBuilder::for(Exam::class);

        if ($actor) {
            $this->teacherScopeService->scopeToTeacherOfferings($actor, $query);
        }

        return $query
            ->allowedFilters(
                AllowedFilter::exact('class_offering_id'),
                AllowedFilter::exact('period_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('classOffering.subject'),
                AllowedInclude::relationship('classOffering.grade'),
                AllowedInclude::relationship('period'),
                AllowedInclude::relationship('creator'),
            )
            ->defaultSort('-exam_date')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $createdBy): Exam
    {
        $this->teacherScopeService->assertClassOfferingIdAccessible($createdBy, (int) $data['class_offering_id']);

        return Exam::query()->create([
            ...$data,
            'created_by' => $createdBy->id,
        ]);
    }

    /**
     * @return Collection<int, array{student: Student, enrollment: Enrollment, result: ?ExamResult}>
     */
    public function getResultsRoster(Exam $exam, ?User $actor = null): Collection
    {
        if ($actor) {
            $this->teacherScopeService->assertOwnsExam($actor, $exam);
        }

        $exam->loadMissing('classOffering');
        $enrollments = $this->rosterEnrollmentsForExam($exam);

        $results = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->get()
            ->keyBy('student_id');

        return $enrollments->map(function (Enrollment $enrollment) use ($results) {
            return [
                'student' => $enrollment->student,
                'enrollment' => $enrollment,
                'result' => $results->get($enrollment->student_id),
            ];
        })->filter(fn (array $row) => $row['student'] !== null)->values();
    }

    /**
     * Students eligible for the exam: active on this offering, or active on any
     * offering in the same grade section (ذكور/إناث) so the full شعبة appears.
     *
     * @return Collection<int, Enrollment>
     */
    private function rosterEnrollmentsForExam(Exam $exam): Collection
    {
        $offering = $exam->classOffering;
        $sectionId = $offering?->grade_section_id;

        $query = Enrollment::query()
            ->where('status', EnrollmentStatus::Active)
            ->with('student');

        if ($sectionId) {
            $query->where(function ($q) use ($exam, $sectionId) {
                $q->where('class_offering_id', $exam->class_offering_id)
                    ->orWhereHas('classOffering', function ($co) use ($sectionId) {
                        $co->where('grade_section_id', $sectionId);
                    });
            });
        } else {
            $query->where('class_offering_id', $exam->class_offering_id);
        }

        return $query
            ->get()
            ->unique('student_id')
            ->sortBy(fn (Enrollment $e) => $e->student?->full_name ?? '', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    /**
     * @param  list<array{student_id: int, score?: ?float, teacher_notes?: ?string}>  $results
     * @return Collection<int, ExamResult>
     */
    public function recordResults(Exam $exam, array $results, ?User $actor = null): Collection
    {
        if ($actor) {
            $this->teacherScopeService->assertOwnsExam($actor, $exam);
        }

        $exam->loadMissing('classOffering');
        $allowedStudentIds = $this->rosterEnrollmentsForExam($exam)
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $allowedLookup = array_flip($allowedStudentIds);

        foreach ($results as $index => $row) {
            $studentId = (int) $row['student_id'];
            if (! isset($allowedLookup[$studentId])) {
                throw ValidationException::withMessages([
                    "results.{$index}.student_id" => [
                        'لا يمكن تسجيل نتيجة لطالب غير مسجّل فعليًا في شعبة هذا الاختبار.',
                    ],
                ]);
            }

            if (isset($row['score']) && $row['score'] !== null) {
                $score = (float) $row['score'];
                if ($score < 0 || $score > (float) $exam->max_score) {
                    throw ValidationException::withMessages([
                        "results.{$index}.score" => [
                            'الدرجة يجب أن تكون بين 0 و'.$exam->max_score.'.',
                        ],
                    ]);
                }
            }
        }

        $saved = DB::transaction(function () use ($exam, $results) {
            $saved = collect();

            foreach ($results as $row) {
                $result = ExamResult::query()->updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'student_id' => (int) $row['student_id'],
                    ],
                    [
                        'score' => array_key_exists('score', $row) ? $row['score'] : null,
                        'teacher_notes' => $row['teacher_notes'] ?? null,
                    ]
                );

                $saved->push($result->load('student.guardian'));
            }

            return $saved;
        });

        foreach ($saved as $result) {
            if ($result->score === null) {
                continue;
            }

            $guardian = $result->student?->guardian;
            if (! $guardian) {
                continue;
            }

            $this->notificationService->send($guardian, 'exam_result_published', [
                'student_name' => $result->student->full_name,
                'exam_title' => $exam->name,
                'score' => $result->score,
                'max_score' => $exam->max_score,
            ]);
        }

        return $saved;
    }

    /**
     * @return LengthAwarePaginator<int, ExamResult>
     */
    public function listForStudent(Student $student, Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(ExamResult::class)
            ->where('student_id', $student->id)
            ->allowedIncludes(
                AllowedInclude::relationship('exam.classOffering.subject'),
                AllowedInclude::relationship('exam.classOffering.grade'),
                AllowedInclude::relationship('exam.period'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }
}
