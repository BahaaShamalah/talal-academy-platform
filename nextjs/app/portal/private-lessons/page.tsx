'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import {
  type PrivateLessonBooking,
  privateLessonStatusLabel,
  unwrapList,
} from '@/lib/account';
import { formatTimeRange12h } from '@/lib/time';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function slotText(booking: PrivateLessonBooking): string {
  const slot = booking.slot;
  if (slot) {
    const time = formatTimeRange12h(slot.start_time, slot.end_time);
    if (slot.specific_date) return `${slot.specific_date} · ${time}`;
    if (slot.day_of_week !== null) return `${WEEKDAYS[slot.day_of_week]} · ${time}`;
    return time;
  }
  if (booking.preferred_period_name) {
    const start = booking.preferred_start_time?.slice(0, 5);
    const end = booking.preferred_end_time?.slice(0, 5);
    if (start && end) {
      return `${booking.preferred_period_name} · ${formatTimeRange12h(start, end)}`;
    }
    return booking.preferred_period_name;
  }
  return 'بانتظار تنسيق الإدارة';
}

const tone: Record<string, string> = {
  pending_coordination: 'bg-[#fff3e6] text-[#c47a1a]',
  pending_payment: 'bg-[#eaf0f8] text-[#1c4b8f]',
  confirmed: 'bg-[#e9f3ec] text-[#2e7d4f]',
  completed: 'bg-[#f4f1ea] text-[#8a8478]',
  cancelled: 'bg-[#f8ecec] text-[#a34b4b]',
};

export default function PortalPrivateLessonsPage() {
  const { selectedStudent } = usePortal();
  const studentId = selectedStudent?.id;
  const [bookings, setBookings] = useState<PrivateLessonBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!studentId) {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/guardian/students/${studentId}/private-lesson-bookings`);
      if (res.ok) setBookings(unwrapList<PrivateLessonBooking>(await res.json()));
      else setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay(invoiceId: number) {
    if (!studentId) return;
    setPayingId(invoiceId);
    try {
      sessionStorage.setItem('pay_return_student_id', String(studentId));
      sessionStorage.removeItem('pay_return_installment');
      sessionStorage.removeItem('pay_return_invoice_id');
      const res = await fetch(`/api/guardian/invoices/${invoiceId}/pay`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.payment_url) {
        window.location.href = json.payment_url;
        return;
      }
      alert(json.message || 'تعذّر بدء الدفع');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <PortalPage title="حصة خاصة" crumb="طلبات ومتابعة">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-dim">
          {selectedStudent
            ? `طلبات ${selectedStudent.full_name}`
            : 'اختر طالبًا من الأعلى'}
        </p>
        <Link
          href="/portal/private-lessons/book"
          className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-2.5 text-[13px] font-extrabold text-gold-soft"
        >
          <Icon name="fa-solid fa-plus" className="text-[11px]" />
          طلب حصة خاصة
        </Link>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
        {!studentId ? (
          <p className="px-[18px] py-8 text-center text-[13px] text-ink-dim">
            اختر أحد الأبناء لعرض الطلبات.
          </p>
        ) : loading ? (
          <p className="px-[18px] py-8 text-[13px] text-ink-dim">جاري التحميل…</p>
        ) : bookings.length === 0 ? (
          <div className="px-[18px] py-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/[.14] text-gold-deep">
              <Icon name="fa-solid fa-user-graduate" className="text-[18px]" />
            </span>
            <p className="text-[14px] font-bold text-navy-800">لا طلبات بعد</p>
            <p className="mt-1 text-[13px] text-ink-dim">المواد والمواعيد تُضبط من الإدارة ثم تظهر هنا للحجز.</p>
            <Link
              href="/portal/private-lessons/book"
              className="mt-4 inline-flex rounded-full border border-cream-line2 bg-white px-4 py-2 text-[12.5px] font-bold text-navy-800"
            >
              ابدأ طلبًا
            </Link>
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3.5 border-b border-[#f4f1ea] px-[18px] py-4 last:border-0"
            >
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-gold/[.14] text-gold-deep">
                <Icon name="fa-solid fa-chalkboard-user" className="text-[14px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[14px] text-ink">
                    {b.offer?.subject?.name ?? `عرض #${b.private_lesson_offer_id}`}
                  </b>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                      tone[b.status] ?? 'bg-[#f4f1ea] text-[#8a8478]',
                    )}
                  >
                    {privateLessonStatusLabel(b.status)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-dim">
                  {[b.offer?.teacher?.name, slotText(b)].filter(Boolean).join(' · ')}
                </p>
              </div>
              {b.status === 'pending_payment' && b.invoice_id ? (
                <button
                  type="button"
                  disabled={payingId === b.invoice_id}
                  onClick={() => void pay(b.invoice_id!)}
                  className="shrink-0 rounded-full bg-navy-800 px-3.5 py-2 text-[12px] font-bold text-gold-soft disabled:opacity-60"
                >
                  {payingId === b.invoice_id ? '…' : 'دفع'}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </PortalPage>
  );
}
