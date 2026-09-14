<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payroll\StorePayrollRunRequest;
use App\Http\Requests\Payroll\UpdatePayrollItemRequest;
use App\Http\Resources\PayrollItemResource;
use App\Http\Resources\PayrollRunResource;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Services\PayrollPdfService;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PayrollController extends Controller
{
    public function __construct(
        private readonly PayrollService $payrollService,
        private readonly PayrollPdfService $payrollPdfService,
    ) {}

    public function storeRun(StorePayrollRunRequest $request): JsonResponse
    {
        $run = $this->payrollService->generateRun(
            $request->validated('period_month'),
            $request->user()->id,
        );

        return (new PayrollRunResource($run))
            ->response()
            ->setStatusCode(201);
    }

    public function indexRuns(Request $request): AnonymousResourceCollection
    {
        return PayrollRunResource::collection($this->payrollService->listRuns($request));
    }

    public function showRun(PayrollRun $payrollRun): PayrollRunResource
    {
        return new PayrollRunResource($payrollRun->load(['items.teacher']));
    }

    public function updateItem(
        UpdatePayrollItemRequest $request,
        PayrollRun $payrollRun,
        PayrollItem $payrollItem,
    ): PayrollItemResource {
        return new PayrollItemResource(
            $this->payrollService->updateItem($payrollRun, $payrollItem, $request->validated())
        );
    }

    public function finalize(Request $request, PayrollRun $payrollRun): PayrollRunResource
    {
        return new PayrollRunResource(
            $this->payrollService->finalizeRun($payrollRun, $request->user()->id)
        );
    }

    public function pdf(PayrollRun $payrollRun): Response
    {
        $result = $this->payrollPdfService->generate($payrollRun);

        return response($result['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$result['filename'].'"',
            'Content-Length' => (string) strlen($result['content']),
        ]);
    }

    public function myItems(Request $request): AnonymousResourceCollection
    {
        $query = PayrollItem::query()
            ->where('teacher_id', $request->user()->id)
            ->with(['payrollRun'])
            ->orderByDesc('id');

        if ($request->filled('per_page')) {
            return PayrollItemResource::collection(
                $query->paginate($request->integer('per_page', 1))->appends($request->query()),
            );
        }

        return PayrollItemResource::collection($query->get());
    }
}
