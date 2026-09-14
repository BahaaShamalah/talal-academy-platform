<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\SyncUserBranchesRequest;
use App\Http\Requests\User\SyncUserRolesRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $users = $this->userService->list($request);

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->userService->update($user, $request->validated()));
    }

    public function syncRoles(SyncUserRolesRequest $request, User $user): UserResource
    {
        return new UserResource(
            $this->userService->syncRoles($user, $request->validated('roles'))
        );
    }

    public function branches(User $user): JsonResponse
    {
        return response()->json($this->userService->getBranches($user));
    }

    public function syncBranches(SyncUserBranchesRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        return new UserResource(
            $this->userService->syncBranches(
                $user,
                (bool) $data['has_all_branch_access'],
                $data['branch_ids'] ?? [],
            )
        );
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->userService->delete($user, $request->user());

        return response()->json(['message' => 'User deleted successfully.']);
    }
}
