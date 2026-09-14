<?php

namespace App\Services;

use App\Support\TimeFormatter;

use App\Enums\AttendanceStatus;
use App\Enums\ClassOfferingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\StudentStatus;
use App\Models\AttendanceRecord;
use App\Models\DailyAttendanceRecord;
use App\Models\ClassOffering;
use App\Models\ClassSession;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Support\Carbon;

class DashboardService
{
    private const ARABIC_MONTHS = [
        1 => 'يناير',
        2 => 'فبراير',
        3 => 'مارس',
        4 => 'أبريل',
        5 => 'مايو',
        6 => 'يونيو',
        7 => 'يوليو',
        8 => 'أغسطس',
        9 => 'سبتمبر',
        10 => 'أكتوبر',
        11 => 'نوفمبر',
        12 => 'ديسمبر',
    ];

    /**
     * @return array{
     *     stats: array{
     *         students_count: int,
     *         active_groups_count: int,
     *         active_offerings_count: int,
     *         month_revenue: string,
     *         attendance_rate: float
     *     },
     *     enrollment_chart: list<array{month: string, key: string, value: int}>,
     *     today_sessions: list<array<string, mixed>>,
     *     recent_enrollments: list<array<string, mixed>>
     * }
     */
    public function overview(): array
    {
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $monthRevenue = Invoice::query()
            ->where('status', InvoiceStatus::Paid)
            ->whereDate('paid_at', '>=', $monthStart)
            ->whereDate('paid_at', '<=', $monthEnd)
            ->sum('total');

        $sessionAttendanceQuery = AttendanceRecord::query()
            ->where('status', '!=', AttendanceStatus::Pending);
        $dailyAttendanceQuery = DailyAttendanceRecord::query()
            ->where('status', '!=', AttendanceStatus::Pending);

        $attendanceTotal = (clone $sessionAttendanceQuery)->count()
            + (clone $dailyAttendanceQuery)->count();
        $attendancePresentLike = (clone $sessionAttendanceQuery)
            ->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])
            ->count()
            + (clone $dailyAttendanceQuery)
                ->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])
                ->count();

        $attendanceRate = $attendanceTotal > 0
            ? round(($attendancePresentLike / $attendanceTotal) * 100, 1)
            : 0.0;

        $activeOfferingsQuery = ClassOffering::query()
            ->where('status', ClassOfferingStatus::Active);

        return [
            'stats' => [
                'students_count' => Student::query()
                    ->where('status', StudentStatus::Active)
                    ->count(),
                'active_groups_count' => (clone $activeOfferingsQuery)
                    ->select('grade_id', 'period_id')
                    ->distinct()
                    ->count(),
                'active_offerings_count' => (clone $activeOfferingsQuery)->count(),
                'month_revenue' => number_format((float) $monthRevenue, 3, '.', ''),
                'attendance_rate' => $attendanceRate,
            ],
            'enrollment_chart' => $this->enrollmentChart(6),
            'today_sessions' => $this->todaySessions(),
            'recent_enrollments' => $this->recentEnrollments(8),
        ];
    }

    /**
     * @return list<array{month: string, key: string, value: int}>
     */
    private function enrollmentChart(int $months): array
    {
        $cursor = now()->startOfMonth()->subMonthsNoOverflow($months - 1);
        $rangeStart = $cursor->copy()->startOfMonth();
        $rangeEnd = now()->endOfMonth();

        $counts = Enrollment::query()
            ->selectRaw("to_char(date_trunc('month', COALESCE(enrolled_at, created_at)), 'YYYY-MM') as ym, COUNT(*)::int as c")
            ->whereRaw('COALESCE(enrolled_at, created_at) >= ?', [$rangeStart])
            ->whereRaw('COALESCE(enrolled_at, created_at) <= ?', [$rangeEnd])
            ->groupBy('ym')
            ->pluck('c', 'ym');

        $rows = [];
        for ($i = 0; $i < $months; $i++) {
            $start = $cursor->copy()->startOfMonth();
            $key = $start->format('Y-m');
            $rows[] = [
                'month' => self::ARABIC_MONTHS[(int) $start->month] ?? $start->format('M'),
                'key' => $key,
                'value' => (int) ($counts[$key] ?? 0),
            ];
            $cursor->addMonthNoOverflow();
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function todaySessions(): array
    {
        $today = now()->toDateString();

        return ClassSession::query()
            ->whereDate('session_date', $today)
            ->with([
                'classOffering.subject',
                'classOffering.grade',
                'classOffering.teacher',
                'classOffering.hall',
                'teacher',
                'hall',
            ])
            ->orderBy('start_time')
            ->get()
            ->map(function (ClassSession $session) {
                $offering = $session->classOffering;
                $subject = $offering?->subject?->name ?? 'حصة';
                $grade = $offering?->grade?->name;
                $teacher = $session->teacher?->name ?? $offering?->teacher?->name;
                $hall = $session->hall?->name ?? $offering?->hall?->name;

                return [
                    'id' => $session->id,
                    'class_offering_id' => $session->class_offering_id,
                    'subject' => $grade ? "{$subject} — {$grade}" : $subject,
                    'teacher' => $teacher,
                    'room' => $hall,
                    'start_time' => $this->formatTime($session->start_time),
                    'end_time' => $this->formatTime($session->end_time),
                    'status' => $session->status instanceof \BackedEnum
                        ? $session->status->value
                        : (string) $session->status,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentEnrollments(int $limit): array
    {
        $enrollments = Enrollment::query()
            ->with([
                'student',
                'classOffering.subject',
                'classOffering.grade',
                'classOffering.gradeSection',
            ])
            ->latest('id')
            ->limit($limit)
            ->get();

        $studentIds = $enrollments->pluck('student_id')->unique()->all();
        $latestInvoices = Invoice::query()
            ->whereIn('student_id', $studentIds !== [] ? $studentIds : [0])
            ->orderByDesc('id')
            ->get()
            ->unique('student_id')
            ->keyBy('student_id');

        return $enrollments->map(function (Enrollment $enrollment) use ($latestInvoices) {
            $offering = $enrollment->classOffering;
            $subject = $offering?->subject?->name ?? 'مادة';
            $grade = $offering?->grade?->name;
            $section = $offering?->gradeSection?->name;
            $invoice = $latestInvoices->get($enrollment->student_id);
            $date = $enrollment->enrolled_at
                ? Carbon::parse($enrollment->enrolled_at)->toDateString()
                : ($enrollment->created_at?->toDateString());

            $sectionLabel = $section
                ? "{$subject} — {$grade} — {$section}"
                : ($grade ? "{$subject} — {$grade}" : $subject);

            return [
                'id' => $enrollment->id,
                'student' => $enrollment->student?->full_name ?? '—',
                'student_id' => $enrollment->student_id,
                'section' => $sectionLabel,
                'date' => $date,
                'amount' => $invoice?->total,
                'status' => $enrollment->status instanceof \BackedEnum
                    ? $enrollment->status->value
                    : (string) $enrollment->status,
            ];
        })->values()->all();
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null) {
            return null;
        }

        return TimeFormatter::to12Hour((string) $time);
    }
}
