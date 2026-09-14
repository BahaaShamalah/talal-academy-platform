<?php

namespace App\Services;

use App\Models\InstituteSetting;
use App\Support\OfficialPrint;
use Illuminate\Support\Carbon;
use Mpdf\Output\Destination;

class ScheduleExportPdfService
{
    public function __construct(
        private readonly ScheduleGridService $scheduleGridService,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{content: string, filename: string}
     */
    public function generate(array $filters): array
    {
        $grid = $this->scheduleGridService->build($filters);
        $html = view('pdf.schedule', $this->viewData($grid))->render();
        $settings = InstituteSetting::current();

        $mpdf = OfficialPrint::makeMpdf();
        $mpdf->SetHTMLFooter(OfficialPrint::pageFooterHtml($settings, 'جدول دراسي رسمي'));
        $mpdf->WriteHTML($html);

        $slug = preg_replace('/\s+/', '-', $grid['title']) ?: 'schedule';
        $filename = 'schedule-'.$slug.'-'.now()->format('Y-m-d').'.pdf';

        return [
            'content' => $mpdf->Output($filename, Destination::STRING_RETURN),
            'filename' => $filename,
        ];
    }

    /**
     * @param  array<string, mixed>  $grid
     * @return array<string, mixed>
     */
    protected function viewData(array $grid): array
    {
        $settings = InstituteSetting::current();
        $settings->loadMissing(['logoMedia', 'stampMedia']);

        return [
            'settings' => $settings,
            'logoSrc' => OfficialPrint::logoSrc($settings, forBrowser: false),
            'stampSrc' => OfficialPrint::stampSrc($settings, forBrowser: false),
            'title' => $grid['title'],
            'subtitle' => $grid['subtitle'],
            'period_name' => $grid['period_name'],
            'day_columns' => $grid['day_columns'],
            'grades' => $grid['grades'],
            'issuedAt' => $this->formatArabicDate(now()),
        ];
    }

    private function formatArabicDate(Carbon $date): string
    {
        $months = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
            5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
            9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
        ];

        return $date->format('j').' '.$months[(int) $date->format('n')].' '.$date->format('Y');
    }
}
