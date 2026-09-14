<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PrivateLessonBookingStatus;
use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use App\Models\InstituteSetting;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PrivateLessonBooking;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PrivateLessonBookingService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return array{
     *     booking: PrivateLessonBooking,
     *     invoice: ?Invoice,
     *     institute_phone: ?string
     * }
     */
    public function createForGuardian(
        Student $student,
        PrivateLessonOffer $offer,
        ?PrivateLessonSlot $slot,
        ?User $createdBy = null,
        ?array $preferredPeriod = null,
    ): array {
        if ($offer->status !== PrivateLessonOfferStatus::Active) {
            throw ValidationException::withMessages([
                'private_lesson_offer_id' => ['عرض الحصة الخاصة غير متاح حاليًا.'],
            ]);
        }

        $this->assertNoDuplicateActiveBooking($student, $offer);

        if ($slot !== null) {
            $this->assertSlotBelongsToOffer($slot, $offer);
            $this->assertSlotHasCapacity($slot, $offer);

            $result = DB::transaction(function () use ($student, $offer, $slot, $createdBy, $preferredPeriod) {
                $booking = PrivateLessonBooking::query()->create([
                    'private_lesson_slot_id' => $slot->id,
                    'private_lesson_offer_id' => $offer->id,
                    'student_id' => $student->id,
                    'status' => PrivateLessonBookingStatus::PendingPayment,
                    'preferred_period_name' => $preferredPeriod['name_ar'] ?? null,
                    'preferred_start_time' => $preferredPeriod['start_time'] ?? null,
                    'preferred_end_time' => $preferredPeriod['end_time'] ?? null,
                ]);

                $invoice = $this->createInvoiceForBooking($booking, $offer, $createdBy);
                $booking->update(['invoice_id' => $invoice->id]);

                return [
                    'booking' => $booking->refresh()->load([
                        'offer.subject',
                        'offer.grade',
                        'offer.teacher',
                        'slot',
                        'invoice',
                        'student.guardian',
                    ]),
                    'invoice' => $invoice,
                    'institute_phone' => null,
                ];
            });

            $this->notifyStaffOfNewBooking($result['booking']);

            return $result;
        }

        $booking = PrivateLessonBooking::query()->create([
            'private_lesson_slot_id' => null,
            'private_lesson_offer_id' => $offer->id,
            'student_id' => $student->id,
            'status' => PrivateLessonBookingStatus::PendingCoordination,
            'preferred_period_name' => $preferredPeriod['name_ar'] ?? null,
            'preferred_start_time' => $preferredPeriod['start_time'] ?? null,
            'preferred_end_time' => $preferredPeriod['end_time'] ?? null,
        ]);

        $booking->load(['offer.subject', 'offer.grade', 'offer.teacher', 'student.guardian']);
        $this->notifyStaffOfNewBooking($booking);

        return [
            'booking' => $booking,
            'invoice' => null,
            'institute_phone' => InstituteSetting::current()->phone,
        ];
    }

    public function confirm(PrivateLessonBooking $booking, ?PrivateLessonSlot $slot, User $createdBy): PrivateLessonBooking
    {
        if ($booking->status !== PrivateLessonBookingStatus::PendingCoordination) {
            throw ValidationException::withMessages([
                'booking' => ['يمكن تأكيد الحجوزات بانتظار التنسيق فقط.'],
            ]);
        }

        $offer = $booking->offer()->firstOrFail();

        if ($slot !== null) {
            $this->assertSlotBelongsToOffer($slot, $offer);
            $this->assertSlotHasCapacity($slot, $offer);
            $booking->private_lesson_slot_id = $slot->id;
        } elseif ($booking->private_lesson_slot_id === null) {
            throw ValidationException::withMessages([
                'private_lesson_slot_id' => ['يجب تحديد موعد للحجز قبل التأكيد.'],
            ]);
        } else {
            $slot = $booking->slot;
            if ($slot) {
                $this->assertSlotHasCapacity($slot, $offer, excludingBookingId: $booking->id);
            }
        }

        return DB::transaction(function () use ($booking, $offer, $createdBy) {
            if ($booking->invoice_id === null) {
                $invoice = $this->createInvoiceForBooking($booking, $offer, $createdBy);
                $booking->invoice_id = $invoice->id;
            }

            $booking->status = PrivateLessonBookingStatus::PendingPayment;
            $booking->save();

            return $booking->refresh()->load(['offer.subject', 'offer.grade', 'offer.teacher', 'slot', 'invoice', 'student.guardian']);
        })->tap(function (PrivateLessonBooking $confirmed) {
            $this->notifyGuardianOfConfirmation($confirmed);
        });
    }

    private function notifyGuardianOfConfirmation(PrivateLessonBooking $booking): void
    {
        $booking->loadMissing(['offer.subject', 'offer.teacher', 'slot', 'student.guardian']);
        $slot = $booking->slot;
        $slotText = '—';
        if ($slot) {
            if ($slot->specific_date) {
                $slotText = $slot->specific_date->toDateString().' '.substr((string) $slot->start_time, 0, 5).'-'.substr((string) $slot->end_time, 0, 5);
            } else {
                $slotText = substr((string) $slot->start_time, 0, 5).'-'.substr((string) $slot->end_time, 0, 5);
            }
        } elseif ($booking->preferred_period_name) {
            $slotText = $booking->preferred_period_name;
            if ($booking->preferred_start_time && $booking->preferred_end_time) {
                $slotText .= ' '.substr((string) $booking->preferred_start_time, 0, 5).'-'.substr((string) $booking->preferred_end_time, 0, 5);
            }
        }

        $this->notificationService->notifyStudentGuardian($booking->student, 'private_lesson_booking_confirmed', [
            'subject' => $booking->offer?->subject?->name ?? '',
            'teacher' => $booking->offer?->teacher?->name ?? '',
            'slot' => $slotText,
            'invoice_id' => $booking->invoice_id ?? '',
        ]);
    }

    /**
     * @return LengthAwarePaginator<int, PrivateLessonBooking>
     */
    public function listForStudent(Student $student, Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(
            PrivateLessonBooking::query()->where('student_id', $student->id)
        )
            ->allowedFilters(AllowedFilter::exact('status'))
            ->with(['offer.subject', 'offer.grade', 'offer.teacher', 'slot', 'invoice'])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    /**
     * @return LengthAwarePaginator<int, PrivateLessonBooking>
     */
    public function listAll(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(PrivateLessonBooking::class)
            ->allowedFilters(AllowedFilter::exact('status'))
            ->with(['offer.subject', 'offer.grade', 'offer.teacher', 'slot', 'invoice', 'student.guardian'])
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }

    private function notifyStaffOfNewBooking(PrivateLessonBooking $booking): void
    {
        $booking->loadMissing(['offer.subject', 'offer.teacher', 'student']);

        $statusLabel = match ($booking->status) {
            PrivateLessonBookingStatus::PendingCoordination => 'بانتظار تنسيق',
            PrivateLessonBookingStatus::PendingPayment => 'بانتظار دفع',
            default => $booking->status?->value ?? '',
        };

        $variables = [
            'student_name' => $booking->student?->full_name ?? '',
            'subject' => $booking->offer?->subject?->name ?? '',
            'teacher' => $booking->offer?->teacher?->name ?? '',
            'status' => $statusLabel,
            'booking_id' => $booking->id,
        ];

        $meta = [
            'booking_id' => $booking->id,
            'action_url' => '/dashboard/private-lesson-bookings',
        ];

        $notified = [];

        User::permission('private-lessons.manage')->get()->each(function (User $user) use ($variables, $meta, &$notified) {
            $this->notificationService->send($user, 'private_lesson_booking_requested', $variables, $meta);
            $notified[(int) $user->id] = true;
        });

        $teacher = $booking->offer?->teacher;
        if ($teacher && empty($notified[(int) $teacher->id])) {
            $this->notificationService->send($teacher, 'private_lesson_booking_requested', $variables, $meta);
        }
    }

    private function createInvoiceForBooking(
        PrivateLessonBooking $booking,
        PrivateLessonOffer $offer,
        ?User $createdBy = null,
    ): Invoice {
        $offer->loadMissing(['subject', 'grade', 'teacher']);
        $subtotal = number_format((float) $offer->price, 3, '.', '');

        $invoice = Invoice::query()->create([
            'invoice_number' => $this->generateInvoiceNumber(),
            'student_id' => $booking->student_id,
            'period_id' => null,
            'coupon_id' => null,
            'status' => InvoiceStatus::Pending,
            'subtotal' => $subtotal,
            'coupon_discount_amount' => '0.000',
            'family_discount_amount' => '0.000',
            'credit_applied_amount' => '0.000',
            'total' => $subtotal,
            'created_by' => $createdBy?->id,
            'notes' => 'حصة خاصة',
        ]);

        InvoiceItem::query()->create([
            'invoice_id' => $invoice->id,
            'itemable_type' => PrivateLessonOffer::class,
            'itemable_id' => $offer->id,
            'description' => $this->buildOfferDescription($offer, $booking),
            'unit_price' => $subtotal,
            'quantity' => 1,
            'line_total' => $subtotal,
        ]);

        return $invoice->load('items');
    }

    private function buildOfferDescription(PrivateLessonOffer $offer, PrivateLessonBooking $booking): string
    {
        $parts = array_filter([
            'حصة خاصة',
            $offer->subject?->name,
            $offer->grade?->name,
            $offer->session_type === PrivateLessonSessionType::Individual ? 'فردي' : 'جماعي',
        ]);

        $booking->loadMissing('slot');
        if ($booking->slot) {
            $slot = $booking->slot;
            if ($slot->specific_date) {
                $parts[] = $slot->specific_date->toDateString();
            }
            $parts[] = substr((string) $slot->start_time, 0, 5).'-'.substr((string) $slot->end_time, 0, 5);
        }

        return implode(' — ', $parts);
    }

    private function assertNoDuplicateActiveBooking(Student $student, PrivateLessonOffer $offer): void
    {
        $exists = PrivateLessonBooking::query()
            ->where('student_id', $student->id)
            ->where('private_lesson_offer_id', $offer->id)
            ->whereNotIn('status', [
                PrivateLessonBookingStatus::Cancelled,
                PrivateLessonBookingStatus::Completed,
            ])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'private_lesson_offer_id' => ['يوجد حجز نشط لهذا الطالب على نفس العرض.'],
            ])->status(409);
        }
    }

    private function assertSlotBelongsToOffer(PrivateLessonSlot $slot, PrivateLessonOffer $offer): void
    {
        if ((int) $slot->private_lesson_offer_id !== (int) $offer->id) {
            throw ValidationException::withMessages([
                'private_lesson_slot_id' => ['الموعد لا ينتمي لهذا العرض.'],
            ]);
        }
    }

    private function assertSlotHasCapacity(
        PrivateLessonSlot $slot,
        PrivateLessonOffer $offer,
        ?int $excludingBookingId = null,
    ): void {
        $occupied = PrivateLessonBooking::query()
            ->where('private_lesson_slot_id', $slot->id)
            ->when(
                $excludingBookingId !== null,
                fn ($q) => $q->whereKeyNot($excludingBookingId),
            )
            ->whereNotIn('status', [
                PrivateLessonBookingStatus::Cancelled,
            ])
            ->count();

        if ($occupied >= (int) $slot->capacity) {
            throw ValidationException::withMessages([
                'private_lesson_slot_id' => ['الموعد ممتلئ.'],
            ])->status(409);
        }
    }

    private function generateInvoiceNumber(): string
    {
        $year = now()->format('Y');
        $maxSequence = Invoice::query()
            ->lockForUpdate()
            ->pluck('invoice_number')
            ->map(function (?string $invoiceNumber) use ($year) {
                if ($invoiceNumber === null || ! preg_match('/^INV-(\d{4})-(\d{5})$/', $invoiceNumber, $matches)) {
                    return 0;
                }

                if ($matches[1] !== $year) {
                    return 0;
                }

                return (int) $matches[2];
            })
            ->max() ?? 0;

        return sprintf('INV-%s-%05d', $year, $maxSequence + 1);
    }
}
