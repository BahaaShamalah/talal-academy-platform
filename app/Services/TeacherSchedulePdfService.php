<?php

namespace App\Services;

use App\Models\InstituteSetting;
use App\Models\User;
use App\Support\OfficialPrint;
use Illuminate\Support\Carbon;
use Mpdf\Output\Destination;

class TeacherSchedulePdfService
{
    public function __construct(
        private readonly TeacherScheduleService $teacherScheduleService,
    ) {}

    /**
     * @return array{content: string, filename: string}
     */
    public function generate(User $teacher, string $view, string $date): array
    {
        $payload = $this->teacherScheduleService->scheduleForTeacher($teacher, $view, $date);
        $html = view('pdf.teacher-schedule', $this->viewData($teacher, $payload))->render();
        $settings = InstituteSetting::current();

        $mpdf = OfficialPrint::makeMpdf();
        $mpdf->SetHTMLFooter(OfficialPrint::pageFooterHtml($settings, 'جدول معلم رسمي'));
        $mpdf->WriteHTML($html);

        $filename = 'teacher-schedule-'.$date.'-'.$view.'.pdf';

        return [
            'content' => $mpdf->Output($filename, Destination::STRING_RETURN),
            'filename' => $filename,
        ];
    }

    /**
     * @param  array{sessions: list<array<string, mixed>>, meta: array{view: string, range_start: string, range_end: string}}  $payload
     * @return array<string, mixed>
     */
    protected function viewData(User $teacher, array $payload): array
    {
        $settings = InstituteSetting::current();
        $settings->loadMissing(['logoMedia', 'stampMedia']);

        $view = $payload['meta']['view'];
        $start = $payload['meta']['range_start'];
        $end = $payload['meta']['range_end'];

        $title = match ($view) {
            'day' => 'جدول الحصص اليومي',
            'month' => 'جدول الحصص الشهري',
            default => 'جدول الحصص الأسبوعي',
        };

        $subtitle = $start === $end
            ? $this->formatArabicDate(Carbon::parse($start))
            : $this->formatArabicDate(Carbon::parse($start)).' — '.$this->formatArabicDate(Carbon::parse($end));

        $grouped = [];
        foreach ($payload['sessions'] as $session) {
            $sessionDate = (string) ($session['session_date'] ?? '');
            if ($sessionDate === '') {
                continue;
            }
            $grouped[$sessionDate][] = [
                'time_range' => $this->formatTimeRange(
                    $session['start_time'] ?? null,
                    $session['end_time'] ?? null,
                ),
                'subject_name' => $session['subject_name'] ?? 'حصة',
                'hall_name' => $session['hall_name'] ?? '—',
                'status' => $session['status'] ?? 'scheduled',
                'status_label' => ($session['status'] ?? '') === 'cancelled' ? 'ملغاة' : 'مجدولة',
            ];
        }

        ksort($grouped);

        $days = [];
        foreach ($grouped as $iso => $sessions) {
            $days[] = [
                'label' => $this->dayHeading($iso),
                'sessions' => $sessions,
            ];
        }

        return [
            'settings' => $settings,
            'logoSrc' => OfficialPrint::logoSrc($settings, forBrowser: false),
            'stampSrc' => OfficialPrint::stampSrc($settings, forBrowser: false),
            'title' => $title,
            'subtitle' => $subtitle,
            'teacherName' => $teacher->name,
            'days' => $days,
        ];
    }

    private function dayHeading(string $iso): string
    {
        $date = Carbon::parse($iso);

        return $date->locale('ar')->translatedFormat('l').' — '.$this->formatArabicDate($date);
    }

    private function formatTimeRange(?string $start, ?string $end): string
    {
        return $this->formatTime12h($start).' – '.$this->formatTime12h($end);
    }

    private function formatTime12h(?string $time): string
    {
        if (! $time) {
            return '—';
        }

        $normalized = substr($time, 0, 5);
        if (! preg_match('/^(\d{1,2}):(\d{2})$/', $normalized, $m)) {
            return $time;
        }

        $hour = (int) $m[1];
        $minute = $m[2];
        $period = $hour >= 12 ? 'م' : 'ص';
        $hour = $hour % 12;
        if ($hour === 0) {
            $hour = 12;
        }

        return $hour.':'.$minute.' '.$period;
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
