'use client';
import { useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminShell from '@/components/admin/AdminShell';
import SectionFormModal from '@/components/admin/SectionFormModal';
import Icon from '@/components/ui/Icon';
import { subjectColors, timeSlots, weekDays, weekGrid } from '@/data/admin';

export default function AdminSchedulePage() {
  const [modal, setModal] = useState(false);
  const grid = 'grid grid-cols-[74px_repeat(5,1fr)]';

  return (
    <AdminShell>
      <AdminHeader title="الجدول الأسبوعي" crumb="الفرع الرئيسي" />

      <main className="p-3.5 sm:p-5">
        <div className="overflow-hidden rounded-[22px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex items-center gap-2">
              <button aria-label="الأسبوع السابق" className="h-8 w-8 rounded-[10px] border border-cream-line bg-white text-ink-soft">
                <Icon name="fa-solid fa-chevron-right" className="text-[11px]" />
              </button>
              <span className="text-[13.5px] font-bold text-navy-800">
                الأسبوع <span className="font-latin">22 – 26 فبراير 2026</span>
              </span>
              <button aria-label="الأسبوع التالي" className="h-8 w-8 rounded-[10px] border border-cream-line bg-white text-ink-soft">
                <Icon name="fa-solid fa-chevron-left" className="text-[11px]" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft">
                <option>كل القاعات</option><option>قاعة 1</option><option>قاعة 2</option>
              </select>
              <button onClick={() => setModal(true)} className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy transition-transform hover:-translate-y-px">
                <Icon name="fa-solid fa-plus" className="text-[11px]" /> إضافة حصة
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className={`${grid} border-b border-[#f0ece1] bg-cream-soft`}>
                <div className="px-2 py-3 text-center text-[11px] text-ink-faint">الوقت</div>
                {weekDays.map((d) => (
                  <div key={d.name} className="border-r border-[#f0ece1] px-2 py-3 text-center">
                    <div className="text-[13px] font-bold text-navy-800">{d.name}</div>
                    <div className="font-latin mt-0.5 text-[10.5px] text-ink-faint">{d.date}</div>
                  </div>
                ))}
              </div>

              {timeSlots.map((time, row) => (
                <div key={time} className={`${grid} border-b border-[#f4f1ea]`}>
                  <div className="font-latin flex items-center justify-center whitespace-pre-line bg-cream-soft px-1.5 py-2.5 text-center text-[11px] leading-relaxed text-ink-dim">
                    {time}
                  </div>
                  {weekGrid[row].map((lesson, col) => (
                    <div key={col} className="min-h-[78px] border-r border-[#f4f1ea] p-1.5">
                      {lesson ? (
                        <div
                          className="h-full cursor-pointer rounded-xl border-r-[3px] border-white/35 px-2.5 py-2 text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-12px_rgba(6,26,58,.35)]"
                          style={{ background: subjectColors[lesson.subject] ?? '#8a8478' }}
                        >
                          <div className="text-[12.5px] font-extrabold leading-tight">{lesson.subject}</div>
                          <div className="mt-1 text-[10.5px] leading-snug opacity-85">{lesson.teacher}</div>
                          <div className="font-latin mt-0.5 text-[10px] opacity-75">{lesson.room}</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModal(true)}
                          aria-label="إضافة حصة"
                          className="h-full min-h-[66px] w-full rounded-xl border border-dashed border-cream-line2 text-[14px] text-[#c9c0af] hover:border-gold hover:text-gold"
                        >
                          <Icon name="fa-solid fa-plus" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 border-t border-[#f0ece1] p-3.5">
            <span className="text-[11.5px] text-ink-faint">المواد:</span>
            {Object.entries(subjectColors).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </main>

      <SectionFormModal open={modal} onClose={() => setModal(false)} />
    </AdminShell>
  );
}
