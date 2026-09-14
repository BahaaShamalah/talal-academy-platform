<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return AuditLogResource::collection(
            $this->auditLogService->list($request),
        );
    }

    public function forSubject(Request $request, string $subject_type, int $subject_id): AnonymousResourceCollection
    {
        return AuditLogResource::collection(
            $this->auditLogService->listForSubject($subject_type, $subject_id, $request),
        );
    }
}
