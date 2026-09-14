<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly RoleService $roleService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->roleService->permissionsGrouped(),
        ]);
    }
}
