<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClassSchedule\StoreClassScheduleRequest;
use App\Http\Requests\ClassSchedule\UpdateClassScheduleRequest;
use App\Http\Resources\ClassScheduleResource;
use App\Models\ClassSchedule;
use App\Services\AuditLogService;
use App\Services\ClassScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassScheduleController extends Controller
{
    public function __construct(
        private readonly ClassScheduleService $classScheduleService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ClassScheduleResource::collection($this->classScheduleService->list($request));
    }

    public function store(StoreClassScheduleRequest $request): JsonResponse
    {
        $force = $request->boolean('force');
        $result = $this->classScheduleService->create($request->safe()->only([
            'class_offering_id',
            'day_of_week',
            'start_time',
            'end_time',
        ]), $force);

        if ($result['blocked']) {
            return response()->json([
                'message' => 'تعارض في الجدول الأسبوعي مع عرض مادة آخر.',
                'conflicts' => $result['conflicts'],
            ], 409);
        }

        if ($result['conflicts'] !== [] && $force) {
            $this->logOverride($request, $result['schedule'], $result['conflicts']);
        }

        $payload = (new ClassScheduleResource($result['schedule']))->resolve();

        return response()->json([
            'data' => $payload,
            'warnings' => $result['conflicts'],
        ], 201);
    }

    public function show(ClassSchedule $classSchedule): ClassScheduleResource
    {
        return new ClassScheduleResource($classSchedule->load('classOffering'));
    }

    public function update(UpdateClassScheduleRequest $request, ClassSchedule $classSchedule): JsonResponse
    {
        $force = $request->boolean('force');
        $result = $this->classScheduleService->update(
            $classSchedule,
            $request->safe()->only([
                'class_offering_id',
                'day_of_week',
                'start_time',
                'end_time',
                'teacher_id',
                'hall_id',
            ]),
            $force,
        );

        if ($result['blocked']) {
            return response()->json([
                'message' => 'تعارض في الجدول الأسبوعي مع عرض مادة آخر.',
                'conflicts' => $result['conflicts'],
            ], 409);
        }

        if ($result['conflicts'] !== [] && $force) {
            $this->logOverride($request, $result['schedule'], $result['conflicts']);
        }

        return response()->json([
            'data' => (new ClassScheduleResource($result['schedule']))->resolve(),
            'warnings' => $result['conflicts'],
            'updated_sessions' => $result['updated_sessions'] ?? 0,
        ]);
    }

    public function destroy(ClassSchedule $classSchedule): JsonResponse
    {
        $this->classScheduleService->delete($classSchedule);

        return response()->json(['message' => 'Class schedule deleted successfully.']);
    }

    /**
     * @param  list<array<string, mixed>>  $conflicts
     */
    private function logOverride(Request $request, ClassSchedule $schedule, array $conflicts): void
    {
        AuditLogService::log(
            'schedule.conflict_overridden',
            $schedule,
            sprintf(
                'تجاوز تعارض جدول أسبوعي #%d (%d تعارضات)',
                $schedule->id,
                count($conflicts),
            ),
            null,
            ['conflicts' => $conflicts],
            $request->user(),
        );
    }
}
