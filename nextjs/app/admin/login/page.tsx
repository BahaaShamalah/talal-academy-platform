'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';

const field = 'w-full rounded-[14px] border border-cream-line2 bg-white py-3 pl-3.5 pr-10 text-[14px] text-ink focus:border-gold focus:outline-none';

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(110%_90%_at_78%_6%,#123163,#0b234a_45%,#061a3a_100%)] px-5 py-10">
      <div className="dots-layer pointer-events-none absolute inset-0 opacity-45" />
      <svg viewBox="0 0 400 400" className="pointer-events-none absolute -top-32 left-1/2 h-[640px] w-[640px] -translate-x-1/2 opacity-50" fill="none">
        <circle cx="200" cy="200" r="170" stroke="rgba(212,169,54,.26)" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="122" stroke="rgba(212,169,54,.14)" strokeWidth="1.2" />
      </svg>

      <div className="relative w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <Image src="/assets/talal-symbol-light.png" alt="طلال أكاديمي" width={66} height={66} className="mx-auto object-contain" />
          <div className="font-display mt-3 text-[26px] font-bold text-white">معهد طلال أكاديمي</div>
          <div className="font-latin mt-1.5 text-[9px] tracking-[.34em] text-gold">ADMIN PANEL</div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); router.push('/admin'); }}
          className="rounded-[22px] bg-cream p-6 shadow-[0_34px_70px_-30px_rgba(0,0,0,.6)]"
        >
          <h1 className="font-display text-[21px] font-bold text-navy-800">تسجيل الدخول</h1>
          <p className="mb-4 mt-1 text-[13px] text-ink-dim">لوحة تحكم الإدارة — للموظفين المصرّح لهم فقط.</p>

          <label htmlFor="a-id" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">البريد الإلكتروني أو رقم الهاتف</label>
          <div className="relative mb-3.5">
            <Icon name="fa-solid fa-user" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#b8ae9e]" />
            <input id="a-id" required dir="ltr" placeholder="admin@talalacademy.edu.kw" className={`${field} text-left`} />
          </div>

          <label htmlFor="a-pw" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">كلمة المرور</label>
          <div className="relative">
            <Icon name="fa-solid fa-lock" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#b8ae9e]" />
            <input id="a-pw" required type="password" placeholder="••••••••" className={field} />
          </div>

          <div className="my-4 flex items-center justify-between text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-2 text-ink-soft">
              <input type="checkbox" className="h-[15px] w-[15px] accent-gold" /> تذكّرني
            </label>
            <a href="#" className="font-semibold text-gold-deep">نسيت كلمة المرور؟</a>
          </div>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[16px] font-extrabold text-navy shadow-[0_14px_30px_-12px_rgba(200,162,74,.75)] transition-transform hover:-translate-y-px">
            <Icon name="fa-solid fa-arrow-left" className="text-[13px]" /> دخول
          </button>
        </form>

        <div className="mt-4 text-center text-[11.5px] text-muted-dim">جميع الجلسات مُسجّلة لأغراض الأمان</div>
      </div>
    </div>
  );
}
