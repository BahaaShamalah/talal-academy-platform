'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import NavyBackdrop from '@/components/onboarding/NavyBackdrop';
import Icon from '@/components/ui/Icon';
import ParentOtpForm from '@/components/auth/ParentOtpForm';
import type { LoginRole } from '@/types/portal';
import { cn } from '@/lib/cn';

const ROLES: { id: LoginRole; label: string }[] = [
  { id: 'parent', label: 'ولي أمر' },
  { id: 'student', label: 'طالب' },
  { id: 'teacher', label: 'معلم' },
];

const COPY: Record<LoginRole, { title: string; sub: string; headline: [string, string]; idLabel: string; idPlaceholder: string; points: { icon: string; title: string }[] }> = {
  parent: {
    title: 'دخول ولي الأمر',
    sub: 'أدخل بياناتك للوصول إلى لوحة متابعة أبنائك.',
    headline: ['متابعة ابنك', 'في مكان واحد'],
    idLabel: 'رقم الهاتف أو البريد الإلكتروني',
    idPlaceholder: '+965 XXXX XXXX',
    points: [
      { icon: 'fa-solid fa-calendar-check', title: 'متابعة الحضور يوميًا' },
      { icon: 'fa-solid fa-book-open', title: 'المواد التعليمية والملفات' },
      { icon: 'fa-solid fa-chart-line', title: 'نتائج الاختبارات والتقييمات' },
      { icon: 'fa-solid fa-wallet', title: 'الاشتراك والفواتير' },
    ],
  },
  student: {
    title: 'دخول الطالب',
    sub: 'ادخل لمتابعة جدولك وواجباتك ونتائج اختباراتك.',
    headline: ['كل دروسك', 'بين يديك'],
    idLabel: 'رقم الهاتف أو البريد الإلكتروني',
    idPlaceholder: '+965 XXXX XXXX',
    points: [
      { icon: 'fa-solid fa-calendar-week', title: 'جدول حصصك الأسبوعي' },
      { icon: 'fa-solid fa-pen-to-square', title: 'واجباتك ومواعيد تسليمها' },
      { icon: 'fa-solid fa-star', title: 'نتائج اختباراتك' },
      { icon: 'fa-solid fa-book', title: 'موادك ومعلموك' },
    ],
  },
  teacher: {
    title: 'دخول المعلمين',
    sub: 'دخول خاص بأعضاء الهيئة التعليمية — لرصد الحضور والدرجات.',
    headline: ['إدارة صفوفك', 'بكل سهولة'],
    idLabel: 'البريد الإلكتروني الوظيفي',
    idPlaceholder: 'name@talalacademy.edu.kw',
    points: [
      { icon: 'fa-solid fa-users-rectangle', title: 'شعبك وطلابك' },
      { icon: 'fa-solid fa-calendar-check', title: 'رصد الحضور والغياب' },
      { icon: 'fa-solid fa-clipboard-check', title: 'إدخال الدرجات والتقييم' },
      { icon: 'fa-solid fa-comment-dots', title: 'ملاحظات لأولياء الأمور' },
    ],
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>('parent');
  const c = COPY[role];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/')) sessionStorage.setItem('auth_redirect', next);
    void (async () => {
      const res = await fetch('/api/guardian/me');
      if (res.ok) router.replace(sessionStorage.getItem('auth_redirect') || '/portal');
    })();
  }, [router]);

  return (
    <div className="onb-wrap flex min-h-screen flex-wrap bg-cream">
      {/* brand side */}
      <aside className="onb-aside relative flex min-w-[320px] flex-1 basis-[440px] flex-col justify-between gap-[clamp(22px,3vw,40px)] overflow-hidden bg-[radial-gradient(120%_90%_at_74%_4%,#123163,#0b234a_46%,#061a3a_100%)] p-[clamp(26px,3.2vw,50px)] text-white">
        <NavyBackdrop sparkles={false} />
        <div className="relative self-start"><BrandMark /></div>

        <div className="relative animate-fadeUp">
          <Image src="/assets/talal-symbol-light.png" alt="" width={74} height={74} className="onb-hide-sm animate-floatY object-contain opacity-95" />
          <h1 className="font-display mt-5 text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.2]">
            {c.headline[0]}<br /><span className="text-gold-soft">{c.headline[1]}</span>
          </h1>
          <p className="mt-3.5 max-w-[380px] text-[15px] leading-[1.9] text-muted">{c.sub}</p>
        </div>

        <div className="onb-hide-sm relative flex flex-col gap-2.5">
          {c.points.map((p) => (
            <div key={p.title} className="flex items-center gap-3 rounded-[13px] bg-white/[.04] px-3.5 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-gold/[.16] text-[13px] text-gold-soft"><Icon name={p.icon} /></span>
              <span className="text-[13.5px] text-muted">{p.title}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* form side */}
      <div className="onb-form app-pad flex min-w-[320px] flex-1 basis-[480px] flex-col justify-center bg-cream px-[clamp(20px,4vw,60px)] py-[clamp(28px,4vw,56px)] text-ink">
        <span className="onb-grab mx-auto mb-5 hidden h-1 w-11 rounded-full bg-[#e0d8c6]" />
        <div className="mx-auto w-full max-w-[400px]">
          <div className="flex gap-[7px] rounded-full border border-cream-line bg-white p-[5px]">
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={cn('flex-1 whitespace-nowrap rounded-full px-2 py-2.5 text-[13px] transition-all duration-[250ms]',
                  role === r.id ? 'bg-navy-800 font-bold text-gold-soft' : 'font-medium text-ink-dim')}>
                {r.label}
              </button>
            ))}
          </div>

          <h2 className="font-display mt-6 text-[27px] font-bold text-navy-800">{c.title}</h2>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-ink-dim">{c.sub}</p>

          {role === 'parent' ? (
            <div className="mt-6">
              <ParentOtpForm defaultRedirect="/portal" />
            </div>
          ) : (
            <div className="mt-6 rounded-[16px] border border-cream-line bg-white px-4 py-5">
              <p className="text-[14px] font-bold text-navy-800">
                {role === 'teacher' ? 'دخول المعلمين' : 'دخول الطالب'}
              </p>
              <p className="mt-2 text-[13px] leading-[1.85] text-ink-dim">
                {role === 'teacher'
                  ? 'لوحة المعلمين متاحة عبر نظام الإدارة. للحصول على حساب راجع إدارة المعهد.'
                  : 'بوابة الطالب غير مفعّلة حاليًا — يتابع ولي الأمر الجدول والنتائج من هذه البوابة.'}
              </p>
            </div>
          )}

          {role !== 'teacher' ? (
            <>
              <div className="my-5.5 my-[22px] flex items-center gap-3">
                <span className="h-px flex-1 bg-cream-line" />
                <span className="text-[12px] text-ink-faint">أو</span>
                <span className="h-px flex-1 bg-cream-line" />
              </div>
              <Link href="/register" className="block w-full rounded-full border border-cream-line2 bg-white py-3.5 text-center text-[15px] font-bold text-navy-800">
                تسجيل حساب جديد
              </Link>
            </>
          ) : (
            <div className="mt-5 flex items-start gap-3 rounded-[15px] border border-gold/40 bg-white px-4 py-3.5">
              <Icon name="fa-solid fa-circle-info" className="mt-0.5 text-[13px] text-gold-deep" />
              <p className="m-0 text-[12.5px] leading-[1.8] text-ink-soft">للحصول على حساب معلم راجع إدارة المعهد.</p>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link href="/?stay=1" className="text-[12.5px] text-ink-dim"><Icon name="fa-solid fa-arrow-left" className="text-[10px]" /> العودة إلى الموقع</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
