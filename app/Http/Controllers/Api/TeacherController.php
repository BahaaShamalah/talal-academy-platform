<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StaffProfile\SyncStaffQualificationsRequest;
use App\Http\Requests\Teacher\StoreTeacherRequest;
use App\Http\Requests\Teacher\UpdateTeacherRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\StaffProfileService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
        private readonly StaffProfileService $staffProfileService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->userService->listTeachers($request));
    }

    public function store(StoreTeacherRequest $request): JsonResponse
    {
        $teacher = $this->userService->createTeacher($request->validated());

        return (new UserResource($teacher))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateTeacherRequest $request, User $user): UserResource
    {
        return new UserResource(
            $this->userService->updateTeacher($user, $request->validated())
        );
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->userService->deleteTeacher($user, $request->user());

        return response()->json(['message' => 'تم حذف المعلم.']);
    }

    public function syncSubjects(SyncStaffQualificationsRequest $request, User $user): UserResource
    {
        abort_unless($user->is_teaching_staff, 422, 'المستخدم ليس معلمًا.');

        $this->staffProfileService->syncQualifications(
            $user,
            $request->validated('subject_ids'),
            $request->validated('grade_ids'),
        );

        return new UserResource(
            $user->fresh([
                'roles',
                'compensationComponents',
                'branches',
                'staffProfile.subjects',
                'staffProfile.grades',
                'staffProfile.documents.media',
            ])->loadCount('taughtClassOfferings')
        );
    }
}
