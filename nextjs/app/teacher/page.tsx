import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { teacher } from '@/data/portal';
import { cn } from '@/lib/cn';

export default function TeacherPortalPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between gap-3.5 bg-navy px-[clamp(16px,3vw,36px)] py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex flex-col text-right leading-tight">
            <b className="font-display text-[16px] text-white">طلال أكاديمي</b>
            <span className="mt-1 font-[Marcellus,serif] text-[7px] tracking-[.2em] text-gold">TEACHER PORTAL</span>
          </span>
          <Image src="/assets/talal-symbol-light.png" alt="" width={36} height={36} className="object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="pt-hide-sm text-left leading-tight">
            <div className="text-[12.5px] font-bold text-white">{teacher.name}</div>
            <div className="text-[11px] text-muted-dim">{teacher.role}</div>
          </div>
          <div className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-full bg-gold/[.18] text-[12.5px] font-bold text-gold-soft">{teacher.initials}</div>
          <Link href="/login" aria-label="تسجيل الخروج" className="flex h-[37px] w-[37px] items-center justify-center rounded-xl border border-gold/30 bg-white/[.06] text-[#c78d8d]">
            <Icon name="fa-solid fa-arrow-right-from-bracket" className="text-[12px]" />
          </Link>
        </div>
      </header>

      <main className="app-pad mx-auto flex max-w-[1240px] flex-col gap-3.5 px-[clamp(16px,3vw,36px)] pb-10 pt-[clamp(16px,2.6vw,26px)]">
        <div>
          <h1 className="font-display text-[24px] font-bold text-navy-800">مرحبًا أ. محمد</h1>
          <p className="mt-1.5 text-[13px] text-ink-dim">لديك ثلاث حصص اليوم · السبت 22/02</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {teacher.stats.map((s) => (
            <div key={s.label} className="rounded-[18px] border border-cream-line bg-white p-4">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep"><Icon name={s.icon} /></span>
              <div className="font-latin mt-3 text-[28px] font-bold leading-none text-navy-800">{s.value}</div>
              <div className="mt-1.5 text-[12.5px] text-ink-soft">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] px-4.5 px-[18px] py-4">
            <h2 className="font-display text-[16.5px] font-bold text-navy-800">حصص اليوم</h2>
          </div>
          {teacher.classes.map((c) => (
            <div key={c.name} className="flex flex-wrap items-center gap-3 border-b border-[#f4f1ea] px-4.5 px-[18px] py-4 last:border-0">
              <div className="min-w-[170px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[14px] text-ink">{c.name}</b>
                  <span className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', c.done ? 'bg-[#e9f3ec] text-[#2e7d4f]' : 'bg-[#f7f0e1] text-gold-deep')}>
                    {c.done ? 'تم رصد الحضور' : 'بانتظار الرصد'}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-ink-dim"><span className="font-latin">{c.time}</span> · {c.room} · {c.students} طالبًا</div>
              </div>
              <button className={cn('whitespace-nowrap rounded-full px-4 py-2.5 text-[12.5px]', c.done ? 'border border-cream-line2 bg-white font-semibold text-ink-soft' : 'bg-gradient-to-br from-gold-soft to-gold font-extrabold text-navy')}>
                {c.done ? 'تعديل' : 'رصد الحضور'}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-[18px] border border-cream-line bg-white p-4.5 p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">مهامّ بانتظارك</h2>
          <div className="flex flex-col gap-2.5">
            {teacher.tasks.map((t) => (
              <div key={t.label} className="flex items-center gap-3 rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gold/[.14] text-gold-deep"><Icon name={t.icon} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-ink">{t.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-dim">{t.meta}</div>
                </div>
                <Icon name="fa-solid fa-chevron-left" className="text-[12px] text-[#c9c0af]" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[16px] border border-gold/40 bg-white px-4.5 px-[18px] py-4">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gold/[.14] text-[14px] text-gold-deep"><Icon name="fa-solid fa-circle-info" /></span>
          <p className="m-0 text-[13.5px] leading-[1.85] text-ink-soft">
            <b className="text-navy-800">ملاحظة:</b> بقية أدوات المعلم (رصد الدرجات، الجدول الكامل، تقارير الطلاب) قيد التطوير — للاستفسار راجع إدارة المعهد.
          </p>
        </div>
      </main>
    </div>
  );
}
