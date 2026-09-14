import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import Icon from '@/components/ui/Icon';
import { enrollmentChart, recentEnrollments, stats, subjectColors, todayLessons } from '@/data/admin';

const CHART_MAX = 80;
const th = 'px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim';

function subjectColor(subject: string) {
  const key = Object.keys(subjectColors).find((k) => subject.includes(k));
  return key ? subjectColors[key] : '#8a8478';
}

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <AdminHeader title="اللوحة الرئيسية" crumb="نظرة عامة على المعهد" />

      <main className="flex flex-col gap-4 p-3.5 sm:p-5">
        {/* stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(212px,1fr))] gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[18px] border border-cream-line bg-white p-4 shadow-[0_10px_24px_-20px_rgba(6,26,58,.5)]">
              <div className="flex items-center justify-between">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
                  <Icon name={s.icon} />
                </span>
                <span
                  className="font-latin flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={s.trendDir === 'up' ? { background: '#e9f3ec', color: '#2e7d4f' } : { background: '#f7f0e1', color: '#8a6a20' }}
                >
                  <Icon name={s.trendDir === 'up' ? 'fa-solid fa-arrow-up' : 'fa-solid fa-minus'} className="text-[9px]" />
                  {s.trend}
                </span>
              </div>
              <div className="font-latin mt-3 text-[31px] font-bold leading-none text-navy-800">{s.value}</div>
              <div className="mt-1.5 text-[13px] text-ink-soft">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-ink-faint">{s.note}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
          {/* chart */}
          <div className="rounded-[18px] border border-cream-line bg-white p-4">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-[16px] font-bold text-navy-800">التسجيلات الشهرية</h2>
                <div className="mt-0.5 text-[11.5px] text-ink-faint">بيانات توضيحية — تُربط بالـAPI</div>
              </div>
              <select className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px] text-ink-soft">
                <option>آخر 6 أشهر</option>
                <option>هذا العام</option>
              </select>
            </div>
            <div className="relative flex h-[158px] items-end gap-2.5 border-b border-[#f0ece1] pb-[22px]">
              {enrollmentChart.map((c, i) => (
                <div key={c.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="font-latin text-[10.5px] text-ink-dim">{c.value}</span>
                  <div
                    className="w-full max-w-[38px] rounded-t-[9px] rounded-b-[4px]"
                    style={{
                      height: `${Math.round((c.value / CHART_MAX) * 100)}%`,
                      background: i === enrollmentChart.length - 2 ? 'linear-gradient(180deg,#e2c67f,#c8a24a)' : 'linear-gradient(180deg,#c5cddd,#9fadc6)',
                    }}
                  />
                  <span className="absolute bottom-1 text-[11px] text-ink-faint">{c.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* today */}
          <div className="rounded-[18px] border border-cream-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-navy-800">حصص اليوم</h2>
              <Link href="/admin/schedule" className="text-[12px] font-semibold text-gold-deep">الجدول الكامل ←</Link>
            </div>
            <div className="flex flex-col gap-2">
              {todayLessons.map((t) => (
                <div key={t.subject} className="flex items-center gap-3 rounded-[13px] border border-[#f0ece1] bg-cream-soft px-3 py-2.5">
                  <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: subjectColor(t.subject) }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{t.subject}</div>
                    <div className="text-[11.5px] text-ink-dim">{t.teacher} · {t.room}</div>
                  </div>
                  <span className="font-latin whitespace-nowrap text-[12px] text-ink-soft">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* recent enrollments */}
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="font-display text-[16px] font-bold text-navy-800">أحدث التسجيلات</h2>
            <Link href="/admin/enrollments" className="text-[12px] font-semibold text-gold-deep">عرض الكل ←</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="bg-cream-soft">
                  <th className={th}>الطالب</th>
                  <th className={th}>الشعبة</th>
                  <th className={th}>التاريخ</th>
                  <th className={th}>المبلغ</th>
                  <th className={th}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((r) => (
                  <tr key={r.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                    <td className="px-4 py-2.5 text-[13.5px] font-semibold text-ink">{r.student}</td>
                    <td className="px-4 py-2.5 text-[13px] text-ink-soft">{r.section}</td>
                    <td className="font-latin px-4 py-2.5 text-[12.5px] text-ink-dim">{r.date}</td>
                    <td className="font-latin px-4 py-2.5 text-[13.5px] font-bold text-navy-800">{r.amount}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
