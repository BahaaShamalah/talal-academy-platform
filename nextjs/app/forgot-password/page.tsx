'use client';
import { useState } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import NavyBackdrop from '@/components/onboarding/NavyBackdrop';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const CHANNELS = [
  { id: 'sms', label: 'رسالة نصية', icon: 'fa-solid fa-comment-sms' },
  { id: 'email', label: 'بريد إلكتروني', icon: 'fa-solid fa-envelope' },
];

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState('sms');

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_74%_4%,#123163,#0b234a_46%,#061a3a_100%)] px-[clamp(18px,4vw,40px)] py-[clamp(24px,5vw,60px)]">
      <NavyBackdrop sparkles={false} />

      <div className="relative mb-6"><BrandMark /></div>

      <div className="relative w-full max-w-[430px] animate-fadeUp overflow-hidden rounded-[24px] bg-cream text-ink shadow-[0_40px_90px_-36px_#000]">
        {!sent ? (
          <div className="p-[clamp(24px,4vw,34px)]">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gold/[.14] text-[21px] text-gold-deep"><Icon name="fa-solid fa-key" /></span>
            <h1 className="font-display mt-4.5 mt-[18px] text-[25px] font-bold text-navy-800">نسيت كلمة المرور؟</h1>
            <p className="mt-2 text-[13.5px] leading-[1.85] text-ink-dim">أدخل رقم هاتفك أو بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.</p>

            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-5.5 mt-[22px] flex flex-col gap-3.5">
              <div>
                <label htmlFor="fg-id" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">رقم الهاتف أو البريد الإلكتروني</label>
                <div className="relative">
                  <Icon name="fa-solid fa-user" className="absolute end-[15px] top-1/2 -translate-y-1/2 text-[13px] text-[#b8ae9e]" />
                  <input id="fg-id" dir="ltr" required placeholder="+965 XXXX XXXX"
                    className="font-latin w-full rounded-[14px] border border-cream-line2 bg-white py-3.5 ps-[42px] pe-4 text-right text-[14px] text-ink focus:border-gold focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                {CHANNELS.map((c) => (
                  <button key={c.id} type="button" onClick={() => setChannel(c.id)}
                    className={cn('flex flex-1 items-center justify-center gap-2 rounded-[14px] border py-3 text-[13px] transition-all',
                      channel === c.id ? 'border-navy-800 bg-navy-800 font-bold text-gold-soft' : 'border-cream-line2 bg-white font-medium text-ink-soft')}>
                    <Icon name={c.icon} className="text-[12px]" /> {c.label}
                  </button>
                ))}
              </div>
              <button type="submit" className="mt-1 rounded-full bg-gradient-to-br from-gold-soft to-gold py-4 text-[16px] font-extrabold text-navy shadow-gold">
                إرسال رابط الاستعادة
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link href="/login" className="text-[12.5px] text-ink-dim"><Icon name="fa-solid fa-arrow-left" className="text-[10px]" /> العودة إلى تسجيل الدخول</Link>
            </div>
          </div>
        ) : (
          <div className="p-[clamp(28px,4vw,38px)] text-center">
            <Icon name="fa-solid fa-envelope-circle-check" className="text-[50px] text-gold-deep" />
            <h1 className="font-display mt-4.5 mt-[18px] text-[24px] font-bold text-navy-800">تم إرسال الرابط</h1>
            <p className="mt-2.5 text-[13.5px] leading-[1.9] text-ink-soft">أرسلنا لك رابط إعادة تعيين كلمة المرور. الرابط صالح لمدة <b className="font-latin text-navy-800">30</b> دقيقة.</p>
            <div className="mt-5.5 mt-[22px] flex flex-col gap-2.5">
              <Link href="/login" className="rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-center text-[15.5px] font-extrabold text-navy">العودة إلى تسجيل الدخول</Link>
              <button onClick={() => setSent(false)} className="rounded-full border border-cream-line2 bg-white py-3.5 text-[14px] font-semibold text-ink-soft">لم يصلني الرابط — إعادة الإرسال</button>
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-5 text-[12.5px] text-muted-dim">
        تحتاج مساعدة؟ <a href="tel:51152474" className="font-latin font-bold text-gold-soft">51152474</a>
      </div>
    </div>
  );
}
