'use client';

import Link from 'next/link';
import { usePortal } from './PortalProvider';
import { personInitials, studentGradeLabel } from '@/lib/portal';
import { cn } from '@/lib/cn';

export default function PortalChildSwitcher() {
  const { students, selectedStudentId, setSelectedStudentId } = usePortal();

  if (students.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-cream-line2 bg-white px-4 py-4 text-center">
        <p className="text-[14px] font-bold text-navy-800">لا يوجد أبناء مسجّلون بعد</p>
        <p className="mt-1 text-[12.5px] text-ink-dim">أضف ابنك أو ابنتك لمتابعة الجدول والاشتراك.</p>
        <Link
          href="/portal/children/new"
          className="mt-3 inline-flex rounded-full bg-navy-800 px-5 py-2 text-[13px] font-extrabold text-gold-soft"
        >
          إضافة ابن/ابنة
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {students.map((c) => {
        const on = selectedStudentId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedStudentId(c.id)}
            className={cn(
              'flex items-center gap-3 rounded-[16px] border-2 py-2.5 pe-4 ps-2.5 transition-all duration-[250ms]',
              on
                ? 'border-gold bg-navy-800 text-white shadow-[0_12px_26px_-18px_rgba(11,35,74,.8)]'
                : 'border-cream-line bg-white text-ink',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold',
                on ? 'bg-gold text-navy' : 'bg-[#f4f1ea] text-gold-deep',
              )}
            >
              {personInitials(c.full_name)}
            </span>
            <span className="text-right">
              <b className="block text-[13.5px]">{c.full_name}</b>
              <span className="mt-0.5 block text-[11px] opacity-70">{studentGradeLabel(c)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
