<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateInstituteSettingRequest;
use App\Http\Resources\InstituteSettingResource;
use App\Services\InstituteSettingService;

class InstituteSettingController extends Controller
{
    public function __construct(
        private readonly InstituteSettingService $instituteSettingService,
    ) {}

    public function show(): InstituteSettingResource
    {
        return new InstituteSettingResource($this->instituteSettingService->get());
    }

    public function update(UpdateInstituteSettingRequest $request): InstituteSettingResource
    {
        $settings = $this->instituteSettingService->update(
            $request->validated(),
            $request->file('logo'),
            $request->file('stamp'),
        );

        return new InstituteSettingResource($settings);
    }
}
