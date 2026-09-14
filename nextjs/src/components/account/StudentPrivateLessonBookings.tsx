'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type PrivateLessonBooking,
  privateLessonStatusLabel,
  unwrapList,
} from '@/lib/account';
import { formatTimeRange12h } from '@/lib/time';

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function slotText(booking: PrivateLessonBooking): string {
  const slot = booking.slot;
  if (!slot) return 'بانتظار تنسيق';
  const time = formatTimeRange12h(slot.start_time, slot.end_time);
  if (slot.specific_date) return `${slot.specific_date} · ${time}`;
  if (slot.day_of_week !== null) return `${WEEKDAYS[slot.day_of_week]} · ${time}`;
  return time;
}

const tone: Record<string, string> = {
  pending_coordination: 'bg-[#fff3e6] text-[#c47a1a]',
  pending_payment: 'bg-[#eaf0f8] text-[#1c4b8f]',
  confirmed: 'bg-[#e9f3ec] text-[#2e7d4f]',
  completed: 'bg-[#f4f1ea] text-[#8a8478]',
  cancelled: 'bg-[#f8ecec] text-[#a34b4b]',
};

export default function StudentPrivateLessonBookings({
  studentId,
  onPay,
  payingId,
}: {
  studentId: string;
  onPay: (invoiceId: number) => void;
  payingId: number | null;
}) {
  const [bookings, setBookings] = useState<PrivateLessonBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guardian/students/${studentId}/private-lesson-bookings`);
      if (res.ok) setBookings(unwrapList<PrivateLessonBooking>(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-[13px] text-[#8a8478]">جاري تحميل الحجوزات…</p>;

  if (bookings.length === 0) {
    return <p className="text-[13px] text-[#8a8478]">لا توجد حجوزات حصص خاصة لهذا الطالب.</p>;
  }

  return (
    <ul className="space-y-2">
      {bookings.map((b) => (
        <li
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8f5ee] px-3 py-2.5 text-[13px]"
        >
          <div>
            <p className="font-bold">{b.offer?.subject?.name ?? `عرض #${b.private_lesson_offer_id}`}</p>
            <p className="text-[#8a8478]">{slotText(b)}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[b.status] ?? 'bg-[#f4f1ea] text-[#8a8478]'}`}
            >
              {privateLessonStatusLabel(b.status)}
            </span>
          </div>
          {b.status === 'pending_payment' && b.invoice_id ? (
            <button
              type="button"
              disabled={payingId === b.invoice_id}
              onClick={() => onPay(b.invoice_id!)}
              className="rounded-full bg-navy-800 px-3.5 py-1.5 text-[12px] font-bold text-gold"
            >
              {payingId === b.invoice_id ? '…' : 'دفع'}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
