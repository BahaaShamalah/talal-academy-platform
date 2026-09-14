<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StaffProfile\StoreStaffDocumentRequest;
use App\Http\Requests\StaffProfile\SyncStaffQualificationsRequest;
use App\Http\Requests\StaffProfile\UpsertStaffProfileRequest;
use App\Http\Resources\StaffDocumentResource;
use App\Http\Resources\StaffProfileResource;
use App\Models\StaffDocument;
use App\Models\User;
use App\Services\StaffProfileService;
use Illuminate\Http\JsonResponse;

class StaffProfileController extends Controller
{
    public function __construct(
        private readonly StaffProfileService $staffProfileService,
    ) {}

    public function show(User $user): StaffProfileResource
    {
        return new StaffProfileResource($this->staffProfileService->getOrFail($user));
    }

    public function upsert(UpsertStaffProfileRequest $request, User $user): StaffProfileResource
    {
        return new StaffProfileResource(
            $this->staffProfileService->upsert($user, $request->validated())
        );
    }

    public function syncQualifications(SyncStaffQualificationsRequest $request, User $user): StaffProfileResource
    {
        $data = $request->validated();

        return new StaffProfileResource(
            $this->staffProfileService->syncQualifications(
                $user,
                $data['subject_ids'] ?? [],
                $data['grade_ids'] ?? [],
            )
        );
    }

    public function storeDocument(StoreStaffDocumentRequest $request, User $user): JsonResponse
    {
        $document = $this->staffProfileService->addDocument($user, $request->validated());

        return (new StaffDocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    public function destroyDocument(StaffDocument $document): JsonResponse
    {
        $this->staffProfileService->deleteDocument($document);

        return response()->json(['message' => 'Staff document deleted successfully.']);
    }
}
