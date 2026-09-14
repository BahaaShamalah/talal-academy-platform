<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class EvaluationService
{
    public function __construct(
        private readonly TeacherScopeService $teacherScopeService,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Evaluation>
     */
    public function listForStudent(Student $student, Request $request, ?User $actor = null): LengthAwarePaginator
    {
        $query = QueryBuilder::for(Evaluation::class)
            ->where('student_id', $student->id);

        if ($actor && ! $this->teacherScopeService->bypassesScope($actor)) {
            $this->teacherScopeService->assertStudentInRoster($actor, $student->id);
            $this->teacherScopeService->scopeToTeacherOfferings($actor, $query);
        }

        return $query
            ->allowedFilters(
                AllowedFilter::exact('class_offering_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('classOffering.subject'),
                AllowedInclude::relationship('classOffering.grade'),
                AllowedInclude::relationship('creator'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Student $student, array $data, User $createdBy): Evaluation
    {
        $this->assertHasEvaluationContent($data);

        $this->teacherScopeService->assertStudentInRoster($createdBy, $student->id);
        $this->teacherScopeService->assertClassOfferingIdAccessible($createdBy, (int) $data['class_offering_id']);

        $enrolled = Enrollment::query()
            ->where('student_id', $student->id)
            ->where('class_offering_id', (int) $data['class_offering_id'])
            ->where('status', EnrollmentStatus::Active)
            ->exists();

        if (! $enrolled) {
            throw ValidationException::withMessages([
                'class_offering_id' => ['الطالب غير مسجّل في هذه المادة.'],
            ])->status(422);
        }

        $evaluation = Evaluation::query()->create([
            ...$data,
            'student_id' => $student->id,
            'created_by' => $createdBy->id,
            'numeric_score_max' => $data['numeric_score_max'] ?? 10,
        ]);

        $evaluation->load(['classOffering.subject', 'student.guardian']);
        $this->notificationService->notifyStudentGuardian($student, 'evaluation_posted', [
            'subject' => $evaluation->classOffering?->subject?->name ?? '',
        ]);

        return $evaluation;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Evaluation $evaluation, array $data, ?User $actor = null): Evaluation
    {
        if ($actor) {
            $this->teacherScopeService->assertOwnsEvaluationGroup($actor, $evaluation);
        }
        $merged = array_merge($evaluation->only([
            'numeric_score',
            'numeric_score_max',
            'level_rating',
            'participation_rating',
            'understanding_rating',
            'homework_rating',
            'discipline_rating',
            'note',
        ]), $data);

        $this->assertHasEvaluationContent($merged);

        $evaluation->update($data);

        return $evaluation->refresh();
    }

    public function delete(Evaluation $evaluation, ?User $actor = null): void
    {
        if ($actor) {
            $this->teacherScopeService->assertOwnsEvaluationGroup($actor, $evaluation);
        }

        $evaluation->delete();
    }

    public function assertCanModify(User $user, Evaluation $evaluation): void
    {
        if ($user->can('evaluations.manage-any')) {
            return;
        }

        if ((int) $evaluation->created_by === (int) $user->id) {
            return;
        }

        abort(403, 'غير مصرح بتعديل أو حذف هذا التقييم.');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertHasEvaluationContent(array $data): void
    {
        $hasNumeric = array_key_exists('numeric_score', $data)
            && $data['numeric_score'] !== null
            && $data['numeric_score'] !== '';

        $hasLevel = ! empty($data['level_rating']);

        $hasCriteria = collect([
            'participation_rating',
            'understanding_rating',
            'homework_rating',
            'discipline_rating',
        ])->contains(fn (string $field) => array_key_exists($field, $data)
            && $data[$field] !== null
            && $data[$field] !== '');

        $hasNote = array_key_exists('note', $data)
            && is_string($data['note'])
            && trim($data['note']) !== '';

        if (! $hasNumeric && ! $hasLevel && ! $hasCriteria && ! $hasNote) {
            throw ValidationException::withMessages([
                'evaluation' => ['أدخل تقييمًا واحدًا على الأقل'],
            ])->status(422);
        }
    }
}
