<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ScheduleExportPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ScheduleExportController extends Controller
{
    public function __construct(
        private readonly ScheduleExportPdfService $scheduleExportPdfService,
    ) {}

    public function pdf(Request $request): Response
    {
        $filters = [
            'educational_stage_id' => $request->integer('educational_stage_id') ?: null,
            'grade_id' => $request->integer('grade_id') ?: null,
            'grade_section_id' => $request->query('grade_section_id'),
            'subject_id' => $request->integer('subject_id') ?: null,
            'gender' => $request->query('gender'),
            'period_id' => $request->integer('period_id') ?: null,
        ];

        $result = $this->scheduleExportPdfService->generate($filters);
        $disposition = $request->boolean('preview') ? 'inline' : 'attachment';

        return response($result['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$result['filename'].'"',
            'Content-Length' => (string) strlen($result['content']),
        ]);
    }
}
