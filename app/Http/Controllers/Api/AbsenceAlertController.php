<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AbsenceAlertResource;
use App\Models\AbsenceAlert;
use App\Services\AbsenceTrackingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AbsenceAlertController extends Controller
{
    public function __construct(
        private readonly AbsenceTrackingService $absenceTrackingService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return AbsenceAlertResource::collection(
            $this->absenceTrackingService
                ->listAlerts($request)
                ->loadMissing(['student', 'classOffering.subject']),
        );
    }

    public function acknowledge(Request $request, AbsenceAlert $alert): AbsenceAlertResource
    {
        return new AbsenceAlertResource(
            $this->absenceTrackingService
                ->acknowledge($alert, $request->user())
                ->load(['student', 'classOffering.subject', 'acknowledger']),
        );
    }
}
