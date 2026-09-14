'use client';
import { useState } from 'react';
import { coursesList, rooms, teachers } from '@/data/admin';
import type { SectionStatus } from '@/types/admin';
import Icon from '../ui/Icon';
import { cn } from '@/lib/cn';

const field = 'w-full rounded-xl border border-cream-line2 bg-white px-3.5 py-2.5 text-[13.5px] text-ink focus:border-gold focus:outline-none';
const label = 'mb-1.5 block text-[12.5px] font-semibold text-ink-soft';

const STATUSES: { id: SectionStatus; label: string }[] = [
  { id: 'active', label: 'نشطة' },
  { id: 'upcoming', label: 'قادمة' },
  { id: 'done', label: 'مكتملة' },
  { id: 'cancelled', label: 'ملغية' },
];

export default function SectionFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<SectionStatus>('active');
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy/55 px-4 pb-6 pt-14 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] overflow-hidden rounded-[22px] bg-cream shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)]">
        <div className="flex items-center justify-between bg-navy-800 px-5 py-4">
          <div>
            <div className="font-latin text-[10px] tracking-[.22em] text-gold">SECTION</div>
            <h2 className="font-display mt-1 text-[19px] font-bold text-white">إضافة شعبة دراسية</h2>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="h-[34px] w-[34px] rounded-[11px] border border-white/20 text-gold-soft">
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <form
          className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5 p-5"
          onSubmit={(e) => { e.preventDefault(); onClose(); }}
        >
          <div className="col-span-full">
            <label htmlFor="s-name" className={label}>اسم الشعبة</label>
            <input id="s-name" required placeholder="مثال: شعبة الرياضيات — المتوسط أ" className={field} />
          </div>
          <div>
            <label htmlFor="s-course" className={label}>الدورة</label>
            <select id="s-course" className={field}>{coursesList.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label htmlFor="s-teacher" className={label}>المعلم</label>
            <select id="s-teacher" className={field}>{teachers.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div>
            <label htmlFor="s-room" className={label}>القاعة</label>
            <select id="s-room" className={field}>{rooms.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div>
            <label htmlFor="s-cap" className={label}>السعة</label>
            <input id="s-cap" type="number" dir="ltr" defaultValue={20} className={`${field} font-latin text-left`} />
          </div>
          <div>
            <label htmlFor="s-start" className={label}>تاريخ البداية</label>
            <input id="s-start" type="date" defaultValue="2026-03-01" className={`${field} font-latin`} />
          </div>
          <div>
            <label htmlFor="s-end" className={label}>تاريخ النهاية</label>
            <input id="s-end" type="date" defaultValue="2026-05-28" className={`${field} font-latin`} />
          </div>

          <div className="col-span-full">
            <span className={label}>الحالة</span>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  className={cn(
                    'rounded-full border-2 bg-white px-4 py-2 text-[13px] transition-all',
                    status === s.id ? 'border-gold font-bold text-gold-deep shadow-[0_8px_18px_-12px_rgba(200,162,74,.9)]' : 'border-cream-line2 font-medium text-ink-dim',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-full">
            <label htmlFor="s-note" className={label}>ملاحظات <span className="font-normal text-ink-faint">(اختياري)</span></label>
            <textarea id="s-note" rows={2} placeholder="أي تفاصيل إضافية عن الشعبة…" className={`${field} resize-y leading-[1.7]`} />
          </div>

          <div className="col-span-full -mx-5 -mb-5 mt-1 flex justify-end gap-2.5 border-t border-cream-line bg-white px-5 py-3.5">
            <button type="button" onClick={onClose} className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft">
              إلغاء
            </button>
            <button type="submit" className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px">
              حفظ الشعبة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
