<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\InstituteSetting;
use App\Models\Invoice;
use App\Support\OfficialPrint;
use Illuminate\Support\Carbon;
use Mpdf\Output\Destination;

class InvoicePdfService
{
    /**
     * @return array{content: string, filename: string}
     */
    public function generate(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'items',
            'student.guardian',
        ]);

        $html = $this->renderHtml($invoice, forBrowser: false);
        $settings = InstituteSetting::current();

        $mpdf = OfficialPrint::makeMpdf([
            'margin_bottom' => 18,
        ]);
        $mpdf->SetHTMLFooter(OfficialPrint::pageFooterHtml($settings, 'فاتورة رسمية'));
        $mpdf->WriteHTML($html);

        $filename = 'invoice-'.$invoice->invoice_number.'.pdf';

        return [
            'content' => $mpdf->Output($filename, Destination::STRING_RETURN),
            'filename' => $filename,
        ];
    }

    public function renderHtml(Invoice $invoice, bool $forBrowser = false): string
    {
        $invoice->loadMissing([
            'items',
            'student.guardian',
        ]);

        return view('pdf.invoice', $this->viewData($invoice, $forBrowser))->render();
    }

    /**
     * @return array<string, mixed>
     */
    protected function viewData(Invoice $invoice, bool $forBrowser): array
    {
        $settings = InstituteSetting::current();
        $settings->loadMissing(['logoMedia', 'stampMedia']);

        return [
            'invoice' => $invoice,
            'settings' => $settings,
            'logoSrc' => OfficialPrint::logoSrc($settings, $forBrowser),
            'stampSrc' => OfficialPrint::stampSrc($settings, $forBrowser),
            'statusLabel' => $this->statusLabel($invoice->status),
            'statusColor' => $this->statusColor($invoice->status),
            'paymentLabel' => $invoice->payment_method
                ? $this->paymentMethodLabel($invoice->payment_method)
                : null,
            'issuedAt' => $this->formatArabicDate($invoice->created_at),
            'paidAt' => $invoice->paid_at ? $this->formatArabicDate($invoice->paid_at) : null,
            'formatMoney' => fn ($amount) => number_format((float) $amount, 3, '.', ','),
            'showCouponDiscount' => (float) $invoice->coupon_discount_amount > 0,
            'showFamilyDiscount' => (float) $invoice->family_discount_amount > 0,
            'showCreditApplied' => (float) $invoice->credit_applied_amount > 0,
            'forBrowser' => $forBrowser,
        ];
    }

    private function statusLabel(?InvoiceStatus $status): string
    {
        return match ($status) {
            InvoiceStatus::Paid => 'مدفوعة',
            InvoiceStatus::Pending => 'معلّقة',
            InvoiceStatus::Cancelled => 'ملغية',
            InvoiceStatus::Refunded => 'مسترجعة',
            default => '—',
        };
    }

    private function statusColor(?InvoiceStatus $status): string
    {
        return match ($status) {
            InvoiceStatus::Paid => '#2e7d4f',
            InvoiceStatus::Pending => '#c47a1a',
            InvoiceStatus::Cancelled => '#6b7280',
            InvoiceStatus::Refunded => '#1c4b8f',
            default => '#6b7280',
        };
    }

    private function paymentMethodLabel(PaymentMethod $method): string
    {
        return match ($method) {
            PaymentMethod::Cash => 'نقدًا',
            PaymentMethod::ManualTransfer => 'تحويل يدوي',
            PaymentMethod::Online => 'دفع إلكتروني',
        };
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
