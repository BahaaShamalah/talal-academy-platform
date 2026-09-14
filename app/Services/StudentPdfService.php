<?php

namespace App\Services;

use App\Enums\Gender;
use App\Enums\StudentStatus;
use App\Models\InstituteSetting;
use App\Models\Student;
use App\Support\OfficialPrint;
use Illuminate\Support\Carbon;
use Mpdf\Output\Destination;

class StudentPdfService
{
    /**
     * @return array{content: string, filename: string}
     */
    public function generate(Student $student): array
    {
        $html = $this->renderHtml($student, forBrowser: false);
        $settings = InstituteSetting::current();

        $mpdf = OfficialPrint::makeMpdf([
            'margin_bottom' => 18,
        ]);
        $mpdf->SetHTMLFooter(OfficialPrint::pageFooterHtml($settings, 'ملف طالب رسمي'));
        $mpdf->WriteHTML($html);

        $safeName = preg_replace('/[^\w\-]+/u', '-', $student->file_number) ?: 'student';
        $filename = 'student-'.$safeName.'.pdf';

        return [
            'content' => $mpdf->Output($filename, Destination::STRING_RETURN),
            'filename' => $filename,
        ];
    }

    public function renderHtml(Student $student, bool $forBrowser = false): string
    {
        $student->loadMissing([
            'guardian',
            'currentGrade.educationalStage',
        ]);

        return view('pdf.student', $this->viewData($student, $forBrowser))->render();
    }

    /**
     * @return array<string, mixed>
     */
    protected function viewData(Student $student, bool $forBrowser): array
    {
        $settings = InstituteSetting::current();
        $settings->loadMissing(['logoMedia', 'stampMedia']);

        $grade = $student->currentGrade;
        $stageLabel = $grade
            ? ($grade->relationLoaded('educationalStage') && $grade->educationalStage
                ? $grade->educationalStage->name.' — '.$grade->name
                : $grade->name)
            : '—';

        return [
            'student' => $student,
            'guardian' => $student->guardian,
            'settings' => $settings,
            'logoSrc' => OfficialPrint::logoSrc($settings, $forBrowser),
            'stampSrc' => OfficialPrint::stampSrc($settings, $forBrowser),
            'stageLabel' => $stageLabel,
            'genderLabel' => $this->genderLabel($student->gender),
            'statusLabel' => $this->statusLabel($student->status),
            'dobLabel' => $student->date_of_birth
                ? $this->formatArabicDate(Carbon::parse($student->date_of_birth))
                : '—',
            'printedAt' => $this->formatArabicDate(now()),
            'forBrowser' => $forBrowser,
        ];
    }

    private function genderLabel(?Gender $gender): string
    {
        return match ($gender) {
            Gender::Male => 'ذكر',
            Gender::Female => 'أنثى',
            default => '—',
        };
    }

    private function statusLabel(?StudentStatus $status): string
    {
        return match ($status) {
            StudentStatus::Active => 'نشط',
            StudentStatus::Inactive => 'غير نشط',
            StudentStatus::Graduated => 'متخرج',
            default => '—',
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
