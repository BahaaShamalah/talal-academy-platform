<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppNotificationResource;
use App\Models\AppNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    public function guardianIndex(Request $request): AnonymousResourceCollection
    {
        $guardian = $request->user('guardian');

        return AppNotificationResource::collection(
            $this->notificationService->listForNotifiable($guardian, $request),
        );
    }

    public function guardianMarkRead(Request $request, AppNotification $notification): AppNotificationResource
    {
        $guardian = $request->user('guardian');

        return new AppNotificationResource(
            $this->notificationService->markRead($notification, $guardian),
        );
    }

    public function meIndex(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        return AppNotificationResource::collection(
            $this->notificationService->listForNotifiable($user, $request),
        );
    }

    public function meMarkRead(Request $request, AppNotification $notification): AppNotificationResource
    {
        $user = $request->user();

        return new AppNotificationResource(
            $this->notificationService->markRead($notification, $user),
        );
    }
}
