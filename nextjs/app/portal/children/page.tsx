'use client';

import Link from 'next/link';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import { hasActiveSubscription, subscriptionBadge } from '@/lib/account';
import { personInitials, studentGradeLabel } from '@/lib/portal';
import { cn } from '@/lib/cn';

export default function PortalChildrenPage() {
  const { students, setSelectedStudentId } = usePortal();

  return (
    <PortalPage title="أبنائي" crumb="إدارة الأبناء والاشتراكات من مكان واحد" showSwitcher={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-dim">
          {students.length ? `${students.length} ${students.length === 1 ? 'طالب' : 'طلاب'}` : 'لا يوجد أبناء بعد'}
        </p>
        <Link
          href="/portal/children/new"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[14px] font-extrabold text-navy shadow-gold"
        >
          <Icon name="fa-solid fa-plus" />
          إضافة ابن/ابنة
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-cream-line2 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/[.14] text-[18px] text-gold-deep">
            <Icon name="fa-solid fa-children" />
          </span>
          <p className="mt-4 text-[16px] font-bold text-navy-800">لا يوجد أبناء مسجّلون بعد</p>
          <p className="mt-1 text-[13px] text-ink-dim">أضف ابنك أو ابنتك للبدء في الاشتراك والمتابعة</p>
          <Link
            href="/portal/children/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy-800 px-6 py-3 text-[14px] font-extrabold text-gold-soft"
          >
            <Icon name="fa-solid fa-plus" />
            إضافة ابن/ابنة
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {students.map((s) => {
            const badge = subscriptionBadge(s);
            return (
              <li
                key={s.id}
                className="rounded-[18px] border border-cream-line bg-white p-[18px] shadow-[0_10px_24px_-22px_rgba(11,35,74,.6)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[15px] font-bold text-gold-soft">
                    {personInitials(s.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[16.5px] font-bold text-navy-800">{s.full_name}</h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-dim">
                      {studentGradeLabel(s)}
                      {s.file_number ? ` · ${s.file_number}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                      badge.tone === 'ok'
                        ? 'bg-[#e9f3ec] text-[#2e7d4f]'
                        : badge.tone === 'warn'
                          ? 'bg-[#f7f0e1] text-gold-deep'
                          : 'bg-[#f0ece1] text-ink-dim',
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/portal/children/${s.id}`}
                    onClick={() => setSelectedStudentId(s.id)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-cream-line2 bg-cream-soft px-3 py-2.5 text-[13px] font-bold text-navy-800"
                  >
                    ملف الطالب
                  </Link>
                  {!hasActiveSubscription(s) ? (
                    <Link
                      href={`/account/children/${s.id}/subscribe`}
                      onClick={() => setSelectedStudentId(s.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-navy-800 px-3 py-2.5 text-[13px] font-bold text-gold-soft"
                    >
                      اشتراك
                    </Link>
                  ) : (
                    <Link
                      href="/portal/schedule"
                      onClick={() => setSelectedStudentId(s.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-navy-800 px-3 py-2.5 text-[13px] font-bold text-gold-soft"
                    >
                      الجدول
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PortalPage>
  );
}
