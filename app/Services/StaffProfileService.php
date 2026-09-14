<?php

namespace App\Services;

use App\Models\StaffDocument;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffProfileService
{
    public function getOrFail(User $user): StaffProfile
    {
        $profile = $user->staffProfile()->with([
            'subjects',
            'grades',
            'documents.media',
        ])->first();

        if (! $profile) {
            throw new NotFoundHttpException('لا يوجد ملف موظف لهذا المستخدم بعد.');
        }

        return $profile;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function upsert(User $user, array $data): StaffProfile
    {
        return DB::transaction(function () use ($user, $data) {
            $profile = StaffProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                $data,
            );

            return $profile->load(['subjects', 'grades', 'documents.media']);
        });
    }

    /**
     * @param  list<int>  $subjectIds
     * @param  list<int>  $gradeIds
     */
    public function syncQualifications(User $user, array $subjectIds, array $gradeIds): StaffProfile
    {
        return DB::transaction(function () use ($user, $subjectIds, $gradeIds) {
            $profile = StaffProfile::query()->firstOrCreate(['user_id' => $user->id]);
            $profile->subjects()->sync($subjectIds);
            $profile->grades()->sync($gradeIds);

            return $profile->load(['subjects', 'grades', 'documents.media']);
        });
    }

    /**
     * @param  array{media_id: int, document_type: string}  $data
     */
    public function addDocument(User $user, array $data): StaffDocument
    {
        return DB::transaction(function () use ($user, $data) {
            $profile = StaffProfile::query()->firstOrCreate(['user_id' => $user->id]);

            $document = StaffDocument::query()->create([
                'staff_profile_id' => $profile->id,
                'media_id' => $data['media_id'],
                'document_type' => $data['document_type'],
                'uploaded_at' => now(),
            ]);

            return $document->load('media');
        });
    }

    public function deleteDocument(StaffDocument $document): void
    {
        $document->delete();
    }
}
