<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InstallmentTemplate\StoreInstallmentTemplateRequest;
use App\Http\Requests\InstallmentTemplate\UpdateInstallmentTemplateRequest;
use App\Http\Resources\InstallmentTemplateResource;
use App\Models\InstallmentTemplate;
use App\Services\InstallmentTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InstallmentTemplateController extends Controller
{
    public function __construct(
        private readonly InstallmentTemplateService $installmentTemplateService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return InstallmentTemplateResource::collection(
            $this->installmentTemplateService->list($request)
        );
    }

    public function store(StoreInstallmentTemplateRequest $request): JsonResponse
    {
        $template = $this->installmentTemplateService->create($request->validated());

        return (new InstallmentTemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    public function show(InstallmentTemplate $installmentTemplate): InstallmentTemplateResource
    {
        return new InstallmentTemplateResource($installmentTemplate);
    }

    public function update(
        UpdateInstallmentTemplateRequest $request,
        InstallmentTemplate $installmentTemplate,
    ): InstallmentTemplateResource {
        return new InstallmentTemplateResource(
            $this->installmentTemplateService->update($installmentTemplate, $request->validated())
        );
    }

    public function destroy(InstallmentTemplate $installmentTemplate): JsonResponse
    {
        $this->installmentTemplateService->delete($installmentTemplate);

        return response()->json(['message' => 'Installment template deleted successfully.']);
    }
}
