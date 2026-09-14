'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import KuwaitPhoneInput from '@/components/ui/KuwaitPhoneInput';
import { isValidKuwaitMobile, normalizeKuwaitPhone } from '@/lib/kuwait-phone';

const field =
  'w-full rounded-xl border border-[#ece6d8] bg-white px-4 py-3 text-[14px] text-[#1c1a17] focus:border-gold focus:outline-none';

type Step = 'phone' | 'otp' | 'name';

type Props = {
  defaultRedirect?: string;
  onAuthenticated?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
};

export default function ParentOtpForm({
  defaultRedirect = '/portal',
  onAuthenticated,
  onCancel,
  showCancel = false,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function finishSuccess() {
    onAuthenticated?.();
    const redirect = sessionStorage.getItem('auth_redirect') || defaultRedirect;
    sessionStorage.removeItem('auth_redirect');
    router.push(redirect);
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const full = normalizeKuwaitPhone(phone);
    if (!isValidKuwaitMobile(full)) {
      setError('أدخل رقم هاتف كويتي صحيح (8 أرقام)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: full }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'تعذّر إرسال الرمز');
        return;
      }
      setDebugOtp(
        typeof data.debug_otp_code === 'string' && data.debug_otp_code ? data.debug_otp_code : null,
      );
      setCode('');
      setStep('otp');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizeKuwaitPhone(phone), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'رمز التحقق غير صحيح');
        return;
      }
      if (data.is_new_guardian) {
        setStep('name');
        return;
      }
      finishSuccess();
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/guardian/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'تعذّر حفظ الاسم');
        return;
      }
      finishSuccess();
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {step === 'phone' ? (
        <form className="flex flex-col gap-3.5" onSubmit={requestCode}>
          <p className="text-[13.5px] leading-[1.8] text-ink-dim">
            أدخل رقم هاتفك وسنرسل لك رمز تحقق عبر الرسائل.
          </p>
          <div>
            <label htmlFor="otp-phone" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">
              رقم الهاتف
            </label>
            <KuwaitPhoneInput
              id="otp-phone"
              required
              value={phone}
              onChange={setPhone}
            />
          </div>
          {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}
          <Button type="submit" size="md" className="w-full" disabled={loading}>
            {loading ? 'جاري الإرسال…' : 'إرسال رمز التحقق'}
          </Button>
          {showCancel && onCancel ? (
            <button type="button" className="text-[13px] text-ink-dim" onClick={onCancel}>
              إلغاء
            </button>
          ) : null}
        </form>
      ) : null}

      {step === 'otp' ? (
        <form className="flex flex-col gap-3.5" onSubmit={verifyCode}>
          <p className="text-[13.5px] leading-[1.8] text-ink-dim">
            أدخل الرمز المرسل إلى{' '}
            <span className="font-latin font-bold text-ink" dir="ltr">
              {normalizeKuwaitPhone(phone) || phone}
            </span>
          </p>
          {debugOtp ? (
            <div className="rounded-xl border border-[#e8c36a] bg-[#fff6db] px-3.5 py-2.5 text-[13px] text-[#8a6a20]">
              <span className="font-bold">وضع تجريبي</span>
              {' — '}
              الكود:{' '}
              <span className="font-latin text-[15px] font-extrabold tracking-wider" dir="ltr">
                {debugOtp}
              </span>
            </div>
          ) : null}
          <input
            className={`${field} font-latin tracking-[0.3em]`}
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}
          <Button type="submit" size="md" className="w-full" disabled={loading || code.length < 6}>
            {loading ? 'جاري التحقق…' : 'تأكيد'}
          </Button>
          <div className="flex justify-between pt-1 text-[12.5px] text-ink-dim">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setDebugOtp(null);
                setError('');
              }}
            >
              تغيير الرقم
            </button>
            <button
              type="button"
              className="font-bold text-gold-deep"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                void requestCode(e as unknown as React.FormEvent);
              }}
            >
              إعادة إرسال الرمز
            </button>
          </div>
        </form>
      ) : null}

      {step === 'name' ? (
        <form className="flex flex-col gap-3.5" onSubmit={saveName}>
          <p className="text-[13.5px] leading-[1.8] text-ink-dim">
            أدخل اسمك للمتابعة — يمكنك إكمال باقي البيانات لاحقًا من حسابك.
          </p>
          <input
            className={field}
            placeholder="الاسم الكامل"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
          {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}
          <Button type="submit" size="md" className="w-full" disabled={loading || !fullName.trim()}>
            {loading ? 'جاري الحفظ…' : 'دخول للبوابة'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
