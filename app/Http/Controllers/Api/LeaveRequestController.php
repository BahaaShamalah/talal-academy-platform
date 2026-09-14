<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leave\AssignSubstituteRequest;
use App\Http\Requests\Leave\ReviewLeaveRequest;
use App\Http\Requests\Leave\StoreLeaveRequest;
use App\Http\Resources\LeaveBalanceResource;
use App\Http\Resources\LeaveRequestResource;
use App\Http\Resources\SessionResource;
use App\Models\ClassSession;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\LeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class LeaveRequestController extends Controller
{
    public function __construct(
        private readonly LeaveService $leaveService,
    ) {}

    public function store(StoreLeaveRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->leaveService->requestLeave(
            $request->user(),
            LeaveType::query()->findOrFail($data['leave_type_id']),
            Carbon::parse($data['start_date'])->startOfDay(),
            Carbon::parse($data['end_date'])->startOfDay(),
            $data['reason'],
            $data['attachment_media_id'] ?? null,
        );

        return response()->json([
            'data' => (new LeaveRequestResource($result['leave_request']))->resolve(),
            'insufficient_balance' => $result['insufficient_balance'],
            'requested_days' => $result['requested_days'],
            'remaining_days' => $result['remaining_days'],
        ], 201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return LeaveRequestResource::collection(
            $this->leaveService->listRequests($request),
        );
    }

    public function review(ReviewLeaveRequest $request, LeaveRequest $leaveRequest): LeaveRequestResource
    {
        return new LeaveRequestResource(
            $this->leaveService->reviewLeave(
                $leaveRequest,
                $request->validated('decision'),
                $request->user(),
                $request->validated('notes'),
            ),
        );
    }

    public function balances(Request $request, User $user): AnonymousResourceCollection
    {
        $actor = $request->user();
        if ((int) $actor->id !== (int) $user->id && ! $actor->can('leaves.view')) {
            abort(403);
        }

        return LeaveBalanceResource::collection(
            $this->leaveService->balancesForUser(
                $user,
                $request->filled('year') ? (int) $request->integer('year') : null,
            ),
        );
    }

    public function substituteSuggestions(LeaveRequest $leaveRequest): JsonResponse
    {
        $rows = $this->leaveService->substituteSuggestions($leaveRequest);

        return response()->json([
            'data' => collect($rows)->map(fn (array $row) => [
                'session' => (new SessionResource($row['session']))->resolve(),
                'suggestions' => $row['suggestions'],
            ])->values(),
        ]);
    }

    public function assignSubstitute(AssignSubstituteRequest $request, ClassSession $session): JsonResponse
    {
        $result = $this->leaveService->assignSubstitute(
            $session,
            (int) $request->validated('teacher_id'),
        );

        if ($result['blocked']) {
            return response()->json([
                'message' => 'تعارض في جلسة مع جلسة أخرى بنفس التاريخ.',
                'conflicts' => $result['conflicts'],
            ], 409);
        }

        return response()->json([
            'data' => (new SessionResource($result['session']))->resolve(),
            'warnings' => $result['conflicts'],
        ]);
    }
}
