'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type Paginated,
  type PrivateLessonBooking,
  type PrivateLessonBookingStatus,
  type PrivateLessonSlot,
} from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';
import { useAuthStore } from '@/stores/auth-store';

type ConfirmMode = 'existing' | 'new';

type ConfirmSlotForm = {
  mode: ConfirmMode;
  slot_id: string;
  schedule_type: 'recurring' | 'once';
  day_of_week: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  capacity: string;
};

const STATUS_OPTIONS: { id: PrivateLessonBookingStatus | ''; label: string }[] = [
  { id: 'pending_coordination', label: 'بانتظار تنسيق' },
  { id: 'pending_payment', label: 'بانتظار دفع' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'cancelled', label: 'ملغى' },
  { id: '', label: 'كل الحالات' },
];

const WEEKDAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
];

function preferredPeriodLabel(booking: PrivateLessonBooking): string | null {
  if (!booking.preferred_period_name) return null;
  const start = booking.preferred_start_time?.slice(0, 5);
  const end = booking.preferred_end_time?.slice(0, 5);
  if (start && end) return `${booking.preferred_period_name} · ${formatTimeRange12h(start, end)}`;
  return booking.preferred_period_name;
}

function slotLabel(slot: PrivateLessonSlot | null | undefined): string {
  if (!slot) return '—';
  const day = slot.specific_date
    ? slot.specific_date
    : WEEKDAYS.find((d) => d.id === slot.day_of_week)?.label ?? '—';
  return `${day} ${formatTimeRange12h(slot.start_time, slot.end_time)}`;
}

function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `965${digits.slice(1)}`;
  if (digits.length === 8) digits = `965${digits}`;
  return digits;
}

function bookingContactPhone(booking: PrivateLessonBooking): string | null {
  const phone =
    booking.student?.contact_phone ||
    booking.student?.guardian?.phone ||
    booking.student?.guardian?.phone_secondary ||
    booking.student?.phone ||
    null;
  return phone?.trim() || null;
}

function buildWhatsAppTemplate(booking: PrivateLessonBooking): string {
  const guardianName = booking.student?.guardian?.full_name || 'ولي الأمر';
  const studentName = booking.student?.full_name || '—';
  const subject = booking.offer?.subject?.name || '—';
  const teacher = booking.offer?.teacher?.name || '—';
  const slot = booking.slot
    ? slotLabel(booking.slot)
    : preferredPeriodLabel(booking) || 'بانتظار تنسيق الموعد';
  const price = booking.offer?.price != null ? String(booking.offer.price) : '—';

  return [
    `مرحباً ${guardianName}،`,
    '',
    `بخصوص طلب الحصة الخاصة للطالب ${studentName}:`,
    `المادة: ${subject}`,
    `المعلم: ${teacher}`,
    `الموعد: ${slot}`,
    `السعر: ${price} د.ك`,
    '',
    'نرجو التواصل معنا لتأكيد التفاصيل.',
  ].join('\n');
}

export function PrivateLessonBookingsPage() {
  const canView = useAuthStore((s) => s.hasPermission('private-lessons.view'));
  const canManage = useAuthStore((s) => s.hasPermission('private-lessons.manage'));
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('pending_coordination');
  const [confirmTarget, setConfirmTarget] = useState<PrivateLessonBooking | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<PrivateLessonBooking | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [confirmForm, setConfirmForm] = useState<ConfirmSlotForm>({
    mode: 'existing',
    slot_id: '',
    schedule_type: 'once',
    day_of_week: '0',
    specific_date: '',
    start_time: '16:00',
    end_time: '17:00',
    capacity: '1',
  });

  const bookingsQuery = useQuery({
    queryKey: ['private-lesson-bookings', statusFilter],
    queryFn: () =>
      apiClient<Paginated<PrivateLessonBooking>>(
        `/private-lesson-bookings${qs({
          per_page: 50,
          'filter[status]': statusFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const offerSlotsQuery = useQuery({
    queryKey: ['private-lesson-offer-slots-confirm', confirmTarget?.private_lesson_offer_id],
    queryFn: () =>
      apiClient<Paginated<PrivateLessonSlot>>(
        `/private-lesson-offers/${confirmTarget!.private_lesson_offer_id}/slots${qs({ per_page: 100 })}`,
      ),
    enabled: !!confirmTarget?.private_lesson_offer_id,
  });

  const bookings = bookingsQuery.data?.data ?? [];
  const offerSlots = offerSlotsQuery.data?.data ?? [];

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!confirmTarget) throw new Error('لا يوجد حجز');

      let slotId: number | null = null;

      if (confirmForm.mode === 'existing') {
        if (!confirmForm.slot_id) throw new Error('اختر موعدًا');
        slotId = Number(confirmForm.slot_id);
      } else {
        const payload: Record<string, unknown> = {
          start_time: confirmForm.start_time,
          end_time: confirmForm.end_time,
        };
        if (confirmForm.schedule_type === 'recurring') {
          payload.day_of_week = Number(confirmForm.day_of_week);
        } else {
          payload.specific_date = confirmForm.specific_date;
        }
        if (confirmTarget.offer?.session_type === 'group') {
          payload.capacity = Number(confirmForm.capacity);
        }

        const slot = await apiClient<PrivateLessonSlot>(
          `/private-lesson-offers/${confirmTarget.private_lesson_offer_id}/slots`,
          { method: 'POST', body: JSON.stringify(payload) },
        );
        slotId = slot.id;
      }

      return apiClient<PrivateLessonBooking>(
        `/private-lesson-bookings/${confirmTarget.id}/confirm`,
        {
          method: 'PUT',
          body: JSON.stringify({ private_lesson_slot_id: slotId }),
        },
      );
    },
    onSuccess: (booking) => {
      toast.success(
        booking.invoice_id
          ? `تم تحديد الموعد — الحالة: بانتظار الدفع — فاتورة #${booking.invoice_id}`
          : 'تم تحديد الموعد',
      );
      setConfirmTarget(null);
      qc.invalidateQueries({ queryKey: ['private-lesson-bookings'] });
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openConfirm(booking: PrivateLessonBooking) {
    setConfirmTarget(booking);
    setConfirmForm({
      mode: 'new',
      slot_id: '',
      schedule_type: 'once',
      day_of_week: '0',
      specific_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      start_time: '16:00',
      end_time: '17:00',
      capacity: String(booking.offer?.max_students ?? 4),
    });
  }

  function openWhatsApp(booking: PrivateLessonBooking) {
    const phone = bookingContactPhone(booking);
    if (!phone || !toWhatsAppNumber(phone)) {
      toast.error('لا يوجد رقم واتساب لولي الأمر');
      return;
    }
    setWhatsappTarget(booking);
    setWhatsappMessage(buildWhatsAppTemplate(booking));
  }

  function sendWhatsApp() {
    if (!whatsappTarget) return;
    const phone = bookingContactPhone(whatsappTarget);
    const wa = phone ? toWhatsAppNumber(phone) : null;
    if (!wa) {
      toast.error('لا يوجد رقم واتساب صحيح');
      return;
    }
    if (!whatsappMessage.trim()) {
      toast.error('اكتب نص الرسالة أولاً');
      return;
    }
    window.open(
      `https://wa.me/${wa}?text=${encodeURIComponent(whatsappMessage.trim())}`,
      '_blank',
      'noopener,noreferrer',
    );
    setWhatsappTarget(null);
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = bookingsQuery.isLoading;
  const isEmpty = !loading && bookings.length === 0;

  if (!canView) {
    return (
      <>
        <AdminHeader title="حجوزات الحصص الخاصة" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="حجوزات الحصص الخاصة" crumb="متابعة الحجوزات" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id || 'all'} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? <TableSkeleton cols={6} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-calendar-check"
              title="لا توجد حجوزات"
              body="لا توجد حجوزات مطابقة للفلتر الحالي."
              secondary={{
                label: 'عرض كل الحالات',
                onClick: () => setStatusFilter(''),
              }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الطالب', 'العرض', 'الموعد', 'الحالة', 'الفاتورة', ''].map((c) => (
                      <th
                        key={c}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">
                          {b.student?.full_name ?? '—'}
                        </div>
                        <div className="font-latin text-[11px] text-ink-dim">
                          {b.student?.file_number ?? ''}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {b.offer?.subject?.name ?? '—'} — {b.offer?.teacher?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {b.slot ? (
                          slotLabel(b.slot)
                        ) : preferredPeriodLabel(b) ? (
                          <span>
                            {preferredPeriodLabel(b)}
                            <span className="mt-0.5 block text-[11px] text-[#c47a1a]">بانتظار تأكيد اليوم</span>
                          </span>
                        ) : (
                          <span className="text-[#c47a1a]">بدون موعد — بانتظار تنسيق</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                        {b.invoice_id ? (
                          <Link
                            href={`/dashboard/invoices/${b.invoice_id}`}
                            className="font-latin font-bold text-navy underline"
                          >
                            #{b.invoice_id}
                          </Link>
                        ) : (
                          <span className="text-ink-dim">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(b)}
                              title="واتساب"
                              className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-[#cfe8d7] bg-[#eef8f1] px-2.5 text-[11.5px] font-bold text-[#2e7d4f]"
                            >
                              <Icon name="fa-brands fa-whatsapp" className="text-[13px]" />
                              واتساب
                            </button>
                          ) : null}
                          {canManage && b.status === 'pending_coordination' ? (
                            <button
                              type="button"
                              onClick={() => openConfirm(b)}
                              className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-cream-line bg-white px-2.5 text-[11.5px] font-bold text-navy"
                            >
                              <Icon name="fa-solid fa-check" className="text-[11px]" />
                              تأكيد الموعد
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={!!confirmTarget}
        onClose={() => {
          if (!confirmMutation.isPending) setConfirmTarget(null);
        }}
        title="تأكيد موعد الحصة الخاصة"
        eyebrow="CONFIRM BOOKING"
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
              className="rounded-full bg-[#2e7d4f] px-5 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
            >
              {confirmMutation.isPending ? 'جاري التأكيد…' : 'تأكيد وإنشاء الفاتورة'}
            </button>
          </>
        }
      >
        {confirmTarget ? (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-soft">
              الطالب: <strong>{confirmTarget.student?.full_name}</strong> —{' '}
              {confirmTarget.offer?.subject?.name} ({confirmTarget.offer?.grade?.name})
            </p>

            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="confirm_mode"
                  checked={confirmForm.mode === 'existing'}
                  onChange={() => setConfirmForm((f) => ({ ...f, mode: 'existing' }))}
                  disabled={offerSlots.length === 0}
                />
                اختيار موعد موجود
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="confirm_mode"
                  checked={confirmForm.mode === 'new'}
                  onChange={() => setConfirmForm((f) => ({ ...f, mode: 'new' }))}
                />
                إنشاء موعد جديد
              </label>
            </div>

            {confirmForm.mode === 'existing' ? (
              <div>
                <label className={formLabelClass}>الموعد</label>
                <select
                  className={formFieldClass}
                  value={confirmForm.slot_id}
                  onChange={(e) => setConfirmForm((f) => ({ ...f, slot_id: e.target.value }))}
                >
                  <option value="">اختر موعدًا</option>
                  {offerSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {slotLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 flex gap-4">
                  {(
                    [
                      { id: 'recurring', label: 'متكرر أسبوعيًا' },
                      { id: 'once', label: 'موعد لمرة واحدة' },
                    ] as const
                  ).map((opt) => (
                    <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input
                        type="radio"
                        name="confirm_schedule_type"
                        checked={confirmForm.schedule_type === opt.id}
                        onChange={() =>
                          setConfirmForm((f) => ({ ...f, schedule_type: opt.id }))
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {confirmForm.schedule_type === 'recurring' ? (
                  <div>
                    <label className={formLabelClass}>اليوم</label>
                    <select
                      className={formFieldClass}
                      value={confirmForm.day_of_week}
                      onChange={(e) =>
                        setConfirmForm((f) => ({ ...f, day_of_week: e.target.value }))
                      }
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={formLabelClass}>التاريخ</label>
                    <input
                      type="date"
                      className={formFieldClass}
                      value={confirmForm.specific_date}
                      onChange={(e) =>
                        setConfirmForm((f) => ({ ...f, specific_date: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div>
                  <label className={formLabelClass}>البداية</label>
                  <input
                    type="time"
                    className={formFieldClass}
                    value={confirmForm.start_time}
                    onChange={(e) => setConfirmForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={formLabelClass}>النهاية</label>
                  <input
                    type="time"
                    className={formFieldClass}
                    value={confirmForm.end_time}
                    onChange={(e) => setConfirmForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </FormModal>

      <FormModal
        open={!!whatsappTarget}
        onClose={() => setWhatsappTarget(null)}
        title="إرسال واتساب لولي الأمر"
        eyebrow="WHATSAPP"
        footer={
          <>
            <button
              type="button"
              onClick={() => setWhatsappTarget(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={sendWhatsApp}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-[13.5px] font-extrabold text-white"
            >
              <Icon name="fa-brands fa-whatsapp" className="text-[15px]" />
              فتح واتساب
            </button>
          </>
        }
      >
        {whatsappTarget ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-soft">
              إلى: <strong>{whatsappTarget.student?.guardian?.full_name ?? 'ولي الأمر'}</strong>
              {bookingContactPhone(whatsappTarget) ? (
                <span className="font-latin text-ink-dim">
                  {' '}
                  · {bookingContactPhone(whatsappTarget)}
                </span>
              ) : null}
            </p>
            <div>
              <label className={formLabelClass}>نص الرسالة (قابل للتعديل)</label>
              <textarea
                className={`${formFieldClass} min-h-[200px] resize-y leading-relaxed`}
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
