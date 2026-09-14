<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\NotificationTemplate\StoreNotificationTemplateRequest;
use App\Http\Requests\NotificationTemplate\UpdateNotificationTemplateRequest;
use App\Http\Resources\NotificationTemplateResource;
use App\Models\NotificationTemplate;
use App\Services\NotificationTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationTemplateController extends Controller
{
    public function __construct(
        private readonly NotificationTemplateService $notificationTemplateService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return NotificationTemplateResource::collection(
            $this->notificationTemplateService->list($request),
        );
    }

    public function store(StoreNotificationTemplateRequest $request): JsonResponse
    {
        $template = $this->notificationTemplateService->create($request->validated());

        return (new NotificationTemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    public function show(NotificationTemplate $notification_template): NotificationTemplateResource
    {
        return new NotificationTemplateResource($notification_template);
    }

    public function update(
        UpdateNotificationTemplateRequest $request,
        NotificationTemplate $notification_template,
    ): NotificationTemplateResource {
        return new NotificationTemplateResource(
            $this->notificationTemplateService->update($notification_template, $request->validated()),
        );
    }

    public function destroy(NotificationTemplate $notification_template): JsonResponse
    {
        $this->notificationTemplateService->delete($notification_template);

        return response()->json(null, 204);
    }
}
