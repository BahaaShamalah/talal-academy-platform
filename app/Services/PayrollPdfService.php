<?php

namespace App\Services;

use App\Enums\CompensationType;
use App\Enums\PayrollRunStatus;
use App\Models\InstituteSetting;
use App\Models\PayrollRun;
use App\Support\OfficialPrint;
use Illuminate\Support\Carbon;
use Mpdf\Output\Destination;

class PayrollPdfService
{
    /**
     * @return array{content: string, filename: string}
     */
    public function generate(PayrollRun $run): array
    {
        $run->loadMissing(['items.teacher']);
        $settings = InstituteSetting::current();
        $settings->loadMissing(['logoMedia', 'stampMedia']);

        $html = view('pdf.payroll', [
            'run' => $run,
            'settings' => $settings,
            'logoSrc' => OfficialPrint::logoSrc($settings, forBrowser: false),
            'stampSrc' => OfficialPrint::stampSrc($settings, forBrowser: false),
            'periodLabel' => $this->periodLabel($run->period_month),
            'statusLabel' => $run->status === PayrollRunStatus::Finalized ? 'معتمدة' : 'مسودة',
            'typeLabel' => fn (?CompensationType $type) => match ($type) {
                CompensationType::FixedMonthly => 'شهري ثابت',
                CompensationType::PerSession => 'حسب الجلسة',
                CompensationType::Manual => 'يدوي',
                CompensationType::Composite => 'تركيبة',
                default => '—',
            },
            'formatMoney' => fn ($amount) => $amount === null
                ? '—'
                : number_format((float) $amount, 3, '.', ','),
            'grandTotal' => $run->items->sum(fn ($item) => (float) ($item->net_amount ?? 0)),
        ])->render();

        $mpdf = OfficialPrint::makeMpdf([
            'margin_bottom' => 18,
        ]);
        $mpdf->SetHTMLFooter(OfficialPrint::pageFooterHtml($settings, 'تقرير رواتب رسمي'));
        $mpdf->WriteHTML($html);

        $filename = 'payroll-'.$run->period_month->format('Y-m').'.pdf';

        return [
            'content' => $mpdf->Output($filename, Destination::STRING_RETURN),
            'filename' => $filename,
        ];
    }

    private function periodLabel(Carbon $period): string
    {
        $months = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
            5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
            9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
        ];

        return ($months[(int) $period->format('n')] ?? $period->format('m')).' '.$period->format('Y');
    }
}
