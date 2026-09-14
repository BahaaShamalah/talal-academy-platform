<?php



namespace App\Services;



use App\Enums\EnrollmentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\ClassSession;
use App\Models\Student;
use App\Support\TimeFormatter;
use Carbon\Carbon;



class GuardianScheduleService

{

    /** @var list<string> indexed by Carbon dayOfWeek (0=Sunday … 6=Saturday) */

    private const ARABIC_DAYS = [

        'الأحد',

        'الاثنين',

        'الثلاثاء',

        'الأربعاء',

        'الخميس',

        'الجمعة',

        'السبت',

    ];



    public function __construct(

        private readonly SessionGeneratorService $sessionGeneratorService,

        private readonly AutoEnrollmentService $autoEnrollmentService,

    ) {}



    /**

     * @return array{

     *     sessions: list<array<string, mixed>>,

     *     waiting_subjects: list<array<string, mixed>>,

     *     meta: array{view: string, range_start: string, range_end: string, payment_pending: bool}

     * }

     */

    public function scheduleForStudent(Student $student, string $view, string $date): array

    {

        $view = in_array($view, ['day', 'week', 'month'], true) ? $view : 'week';

        $anchor = Carbon::parse($date)->startOfDay();

        [$rangeStart, $rangeEnd] = $this->resolveViewRange($view, $anchor->toDateString());



        $activeOfferings = $student->enrollments()
            ->where('status', EnrollmentStatus::Active)
            ->with(['classOffering.schedules'])
            ->get()
            ->pluck('classOffering')
            ->filter()
            ->unique('id')
            ->values();

        $this->sessionGeneratorService->ensureSessionsInRange(
            $activeOfferings,
            $rangeStart->toDateString(),
            $rangeEnd->toDateString(),
        );

        $offeringIds = $activeOfferings->pluck('id')->all();



        $sessions = ClassSession::query()

            ->whereIn('class_offering_id', $offeringIds ?: [0])

            ->whereDate('session_date', '>=', $rangeStart->toDateString())

            ->whereDate('session_date', '<=', $rangeEnd->toDateString())

            ->with(['classOffering.subject', 'classOffering.teacher', 'classOffering.hall'])

            ->orderBy('session_date')

            ->orderBy('start_time')

            ->get()

            ->map(fn (ClassSession $session) => $this->formatSession($session))

            ->values()

            ->all();



        $waiting = $this->autoEnrollmentService->scheduleForStudent($student)['waiting'];



        $paymentPending = $student->planSubscriptions()

            ->where('status', SubscriptionStatus::PendingPayment)

            ->exists();



        return [

            'sessions' => $sessions,

            'waiting_subjects' => $waiting,

            'meta' => [

                'view' => $view,

                'range_start' => $rangeStart->toDateString(),

                'range_end' => $rangeEnd->toDateString(),

                'payment_pending' => $paymentPending,

            ],

        ];

    }



    /**

     * @return array{0: Carbon, 1: Carbon}

     */

    public function resolveViewRange(string $view, string $date): array

    {

        $anchor = Carbon::parse($date)->startOfDay();



        return match ($view) {

            'day' => [$anchor->copy(), $anchor->copy()],

            'month' => [

                $anchor->copy()->startOfMonth()->startOfDay(),

                $anchor->copy()->endOfMonth()->startOfDay(),

            ],

            default => [

                $anchor->copy()->startOfWeek(Carbon::SATURDAY)->startOfDay(),

                $anchor->copy()->endOfWeek(Carbon::FRIDAY)->startOfDay(),

            ],

        };

    }



    /**

     * @return array<string, mixed>

     */

    public function formatSession(ClassSession $session): array

    {

        $date = Carbon::parse($session->session_date);

        $dayIndex = (int) $date->dayOfWeek;



        return [

            'id' => $session->id,

            'session_date' => $date->toDateString(),

            'day_name' => self::ARABIC_DAYS[$dayIndex] ?? '',

            'start_time' => $this->formatTime($session->start_time),

            'end_time' => $this->formatTime($session->end_time),

            'subject_name' => $session->classOffering?->subject?->name,

            'teacher_name' => $session->classOffering?->teacher?->name,

            'hall_name' => $session->classOffering?->hall?->name,

            'status' => $session->status instanceof \BackedEnum

                ? $session->status->value

                : (string) $session->status,

            'class_offering_id' => $session->class_offering_id,

        ];

    }



    private function formatTime(mixed $time): ?string

    {

        if ($time === null) {

            return null;

        }



        return TimeFormatter::to12Hour((string) $time);

    }

}

