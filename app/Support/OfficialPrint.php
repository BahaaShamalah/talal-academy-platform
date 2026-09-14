<?php

namespace App\Support;

use App\Models\InstituteSetting;
use App\Models\Media;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;

/**
 * Shared official A4 print shell helpers for all PDF/HTML documents.
 */
final class OfficialPrint
{
    public static function logoSrc(InstituteSetting $settings, bool $forBrowser): ?string
    {
        $settings->loadMissing(['logoMedia']);

        if ($forBrowser) {
            return self::mediaPublicUrl($settings->logoMedia);
        }

        $path = $settings->logoAbsolutePath();

        return ($path && is_file($path)) ? $path : null;
    }

    public static function stampSrc(InstituteSetting $settings, bool $forBrowser): ?string
    {
        $settings->loadMissing(['stampMedia']);

        if ($forBrowser) {
            return self::mediaPublicUrl($settings->stampMedia);
        }

        $path = $settings->stampAbsolutePath();

        return ($path && is_file($path)) ? $path : null;
    }

    public static function mediaPublicUrl(?Media $media): ?string
    {
        if (! $media) {
            return null;
        }

        $path = $media->url();

        return str_starts_with($path, 'http') ? $path : url($path);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    public static function makeMpdf(array $overrides = []): Mpdf
    {
        $tempDir = storage_path('app/mpdf-temp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $defaultConfig = (new ConfigVariables)->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $fontDirs[] = resource_path('fonts');

        $defaultFontConfig = (new FontVariables)->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];
        $fontData['cairo'] = [
            'R' => 'Cairo-Regular.ttf',
            'B' => 'Cairo-Bold.ttf',
            'useOTL' => 0xFF,
            'useKashida' => 75,
        ];

        $mpdf = new Mpdf(array_merge([
            'mode' => 'utf-8',
            'format' => 'A4',
            'fontDir' => $fontDirs,
            'fontdata' => $fontData,
            'default_font' => 'cairo',
            'margin_left' => 14,
            'margin_right' => 14,
            'margin_top' => 12,
            'margin_bottom' => 14,
            'tempDir' => $tempDir,
            'directionality' => 'rtl',
        ], $overrides));

        $mpdf->SetDisplayMode('fullpage');
        $mpdf->autoScriptToLang = true;
        $mpdf->autoLangToFont = false;

        return $mpdf;
    }

    public static function pageFooterHtml(InstituteSetting $settings, string $documentLabel): string
    {
        $nameAr = e($settings->institute_name_ar ?: '—');
        $nameEn = e($settings->institute_name_en ?: '—');
        $label = e($documentLabel);

        $note = $settings->invoice_footer_note
            ? '<div style="margin-bottom:3px;font-size:7pt;">'.e($settings->invoice_footer_note).'</div>'
            : '';

        return '
            <div style="font-family: cairo, dejavusans; font-size: 7.5pt; color: #4f5766; border-top: 1px solid #d8dde5; padding-top: 5px; direction: rtl;">
                '.$note.'
                <table width="100%" style="border-collapse:collapse;">
                    <tr>
                        <td style="width:32%;text-align:right;color:#071d41;font-weight:bold;">'.$nameAr.'</td>
                        <td style="width:36%;text-align:center;">'.$label.' — صفحة {PAGENO} من {nbpg}</td>
                        <td style="width:32%;text-align:left;direction:ltr;">'.$nameEn.'</td>
                    </tr>
                </table>
            </div>
        ';
    }
}
