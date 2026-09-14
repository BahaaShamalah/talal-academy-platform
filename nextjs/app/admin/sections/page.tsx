'use client';
import { useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import EmptyState from '@/components/admin/EmptyState';
import SectionFormModal from '@/components/admin/SectionFormModal';
import Icon from '@/components/ui/Icon';
import { sections } from '@/data/admin';

const COLS = ['الشعبة', 'الدورة', 'المعلم', 'القاعة', 'السعة', 'الفترة', 'الحالة'];
const select = 'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

function fillColor(pct: number) {
  return pct >= 100 ? '#a34b4b' : pct >= 80 ? '#8a6a20' : '#2e7d4f';
}

export default function AdminSectionsPage() {
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(
    () =>
      sections.filter(
        (s) =>
          (!query || s.name.includes(query) || s.teacher.includes(query)) &&
          (!status || s.status === status),
      ),
    [query, status],
  );

  const reset = () => { setQuery(''); setStatus(''); };

  return (
    <AdminShell>
      <AdminHeader title="الشعب الدراسية" crumb="الدورات ← الشعب" />

      <main className="p-3.5 sm:p-5">
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          {/* toolbar — always visible, including in the empty state */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[190px] max-w-[290px] flex-1">
                <Icon name="fa-solid fa-magnifying-glass" className="absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[#b8ae9e]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث باسم الشعبة أو المعلم…"
                  className="w-full rounded-[11px] border border-cream-line bg-cream-soft py-2 pl-3 pr-8 text-[13px] text-ink focus:border-gold focus:outline-none"
                />
              </div>
              <select className={select}><option>كل الدورات</option><option>رياضيات — متوسط</option><option>دورة القدرات</option></select>
              <select className={select}><option>كل الفروع</option><option>الفرع الرئيسي</option><option>فرع الجهراء</option></select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={select}>
                <option value="">كل الحالات</option>
                <option value="active">نشطة</option>
                <option value="upcoming">قادمة</option>
                <option value="done">مكتملة</option>
                <option value="cancelled">ملغية</option>
              </select>
            </div>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
            >
              <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة شعبة جديدة
            </button>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-layer-group"
              title="لا توجد شعب مطابقة"
              body="لم نجد شعبًا تطابق الفلاتر الحالية. جرّب توسيع نطاق البحث أو أضف شعبة جديدة للبدء."
              primary={{ label: 'إضافة شعبة', onClick: () => setModal(true) }}
              secondary={{ label: 'إعادة ضبط الفلاتر', onClick: reset }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse">
                  <thead>
                    <tr className="bg-cream-soft">
                      <th className="w-[34px] px-4 py-3"><input type="checkbox" className="h-[15px] w-[15px] accent-gold" /></th>
                      {COLS.map((c, i) => (
                        <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim" style={i === 0 ? { minWidth: 200 } : undefined}>
                          {c}
                        </th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const pct = Math.round((r.filled / r.capacity) * 100);
                      return (
                        <tr key={r.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                          <td className="px-4 py-3"><input type="checkbox" className="h-[15px] w-[15px] accent-gold" /></td>
                          <td className="px-4 py-3" style={{ minWidth: 200 }}>
                            <div className="whitespace-nowrap text-[13.5px] font-bold text-ink">{r.name}</div>
                            <div className="font-latin mt-0.5 text-[11px] text-ink-faint">{r.code}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">{r.course}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">{r.teacher}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">{r.room}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-[52px] overflow-hidden rounded-full bg-[#f0ece1]">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fillColor(pct) }} />
                              </div>
                              <span className="font-latin whitespace-nowrap text-[12px] text-ink-soft">{r.filled} / {r.capacity}</span>
                            </div>
                          </td>
                          <td className="font-latin whitespace-nowrap px-4 py-3 text-[12px] text-ink-dim">{r.startDate} – {r.endDate}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => setModal(true)} aria-label="تعديل" className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft">
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                              <button aria-label="حذف" className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]">
                                <Icon name="fa-solid fa-trash" className="text-[11px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#f0ece1] px-4 py-3">
                <span className="text-[12.5px] text-ink-dim">
                  عرض <b className="font-latin text-navy-800">1–{rows.length}</b> من <b className="font-latin text-navy-800">42</b> شعبة
                </span>
                <div className="flex items-center gap-1.5">
                  <button disabled className="h-8 w-8 rounded-[10px] border border-cream-line bg-white text-[#b8ae9e]">
                    <Icon name="fa-solid fa-chevron-right" className="text-[11px]" />
                  </button>
                  {[1, 2, 3, '…', 6].map((n, i) => (
                    <button
                      key={i}
                      className={`font-latin h-8 min-w-8 rounded-[10px] px-2 text-[12.5px] font-semibold ${i === 0 ? 'bg-navy-800 text-gold-soft' : 'border border-cream-line bg-white text-ink-soft'}`}
                    >
                      {n}
                    </button>
                  ))}
                  <button className="h-8 w-8 rounded-[10px] border border-cream-line bg-white text-ink-soft">
                    <Icon name="fa-solid fa-chevron-left" className="text-[11px]" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <SectionFormModal open={modal} onClose={() => setModal(false)} />
    </AdminShell>
  );
}
