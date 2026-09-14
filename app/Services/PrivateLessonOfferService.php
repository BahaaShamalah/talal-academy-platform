<?php

namespace App\Services;

use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use App\Models\PrivateLessonOffer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class PrivateLessonOfferService
{
    public function __construct(
        private readonly MediaService $mediaService,
    ) {}

    /**
     * @return LengthAwarePaginator<int, PrivateLessonOffer>
     */
    public function list(Request $request, bool $activeOnly = false): LengthAwarePaginator
    {
        $query = PrivateLessonOffer::query()->with('imageMedia');

        if ($activeOnly) {
            $query->where('status', PrivateLessonOfferStatus::Active);
        }

        return QueryBuilder::for($query)
            ->allowedFilters(
                AllowedFilter::exact('grade_id'),
                AllowedFilter::exact('subject_id'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('grade'),
                AllowedInclude::relationship('subject'),
                AllowedInclude::relationship('teacher'),
                AllowedInclude::relationship('slots'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): PrivateLessonOffer
    {
        $this->validateSessionTypeFields($data);

        return PrivateLessonOffer::query()->create($data)->load(['grade', 'subject', 'teacher', 'imageMedia']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PrivateLessonOffer $offer, array $data): PrivateLessonOffer
    {
        $merged = array_merge($offer->only([
            'session_type',
            'max_students',
        ]), $data);

        if (isset($data['session_type']) || isset($data['max_students'])) {
            $this->validateSessionTypeFields($merged);
        }

        $oldImageId = $offer->image_media_id;
        $offer->update($data);
        $offer = $offer->refresh()->load(['grade', 'subject', 'teacher', 'slots', 'imageMedia']);

        if (array_key_exists('image_media_id', $data) && $oldImageId && (int) $oldImageId !== (int) $offer->image_media_id) {
            $this->mediaService->deleteIfOrphan((int) $oldImageId);
        }

        return $offer;
    }

    public function delete(PrivateLessonOffer $offer): void
    {
        $oldImageId = $offer->image_media_id;
        $offer->delete();
        $this->mediaService->deleteIfOrphan($oldImageId ? (int) $oldImageId : null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateSessionTypeFields(array $data): void
    {
        $type = $data['session_type'] ?? null;
        $maxStudents = $data['max_students'] ?? null;

        if ($type === PrivateLessonSessionType::Group->value || $type === PrivateLessonSessionType::Group) {
            if ($maxStudents === null || (int) $maxStudents < 2) {
                throw ValidationException::withMessages([
                    'max_students' => ['الحصة الجماعية تتطلب تحديد الحد الأقصى للطلاب (2 على الأقل).'],
                ]);
            }
        }

        if ($type === PrivateLessonSessionType::Individual->value || $type === PrivateLessonSessionType::Individual) {
            if ($maxStudents !== null) {
                throw ValidationException::withMessages([
                    'max_students' => ['الحصة الفردية لا تدعم max_students.'],
                ]);
            }
        }
    }
}
