'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { normalizeAuthUser } from '@/lib/normalize-user';
import { defaultDashboardPath } from '@/lib/dashboard-routes';
import { Icon } from '@/components/ui/icon';

const field =
  'w-full rounded-[14px] border border-cream-line2 bg-white py-3 pl-3.5 pr-10 text-[14px] text-ink focus:border-gold focus:outline-none';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'فشل تسجيل الدخول');
        return;
      }

      const user = normalizeAuthUser(json.user);
      if (!user) {
        setError('تعذر قراءة بيانات المستخدم');
        return;
      }

      setUser(user);
      setHydrated(true);
      const next = searchParams.get('next');
      router.replace(next || defaultDashboardPath(user));
      router.refresh();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-[400px]">
      <div className="mb-6 text-center">
        <Image
          src="/assets/talal-symbol-light.png"
          alt="طلال أكاديمي"
          width={66}
          height={66}
          className="mx-auto object-contain"
        />
        <div className="font-display mt-3 text-[26px] font-bold text-white">معهد طلال أكاديمي</div>
        <div className="font-latin mt-1.5 text-[9px] tracking-[.34em] text-gold">ADMIN PANEL</div>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-[22px] bg-cream p-6 shadow-[0_34px_70px_-30px_rgba(0,0,0,.6)]"
      >
        <h1 className="font-display text-[21px] font-bold text-navy-800">تسجيل الدخول</h1>
        <p className="mb-4 mt-1 text-[13px] text-ink-dim">
          لوحة تحكم الإدارة — للموظفين المصرّح لهم فقط.
        </p>

        <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">
          البريد الإلكتروني
        </label>
        <div className="relative mb-3.5">
          <Icon
            name="fa-solid fa-user"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#b8ae9e]"
          />
          <input
            id="email"
            type="email"
            required
            dir="ltr"
            placeholder="admin@talalacademy.edu.kw"
            className={`${field} text-left`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">
          كلمة المرور
        </label>
        <div className="relative">
          <Icon
            name="fa-solid fa-lock"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#b8ae9e]"
          />
          <input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="my-4 flex items-center justify-between text-[12.5px]">
          <label className="flex cursor-pointer items-center gap-2 text-ink-soft">
            <input
              type="checkbox"
              className="h-[15px] w-[15px] accent-gold"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            تذكّرني
          </label>
          <span className="font-semibold text-gold-deep">نسيت كلمة المرور؟</span>
        </div>

        {error ? (
          <p className="mb-3 rounded-[12px] bg-[#f8ecec] px-3 py-2 text-[13px] text-[#a34b4b]">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[16px] font-extrabold text-navy shadow-[0_14px_30px_-12px_rgba(200,162,74,.75)] transition-transform hover:-translate-y-px disabled:opacity-70"
        >
          <Icon name="fa-solid fa-arrow-left" className="text-[13px]" />
          {loading ? 'جاري الدخول…' : 'دخول'}
        </button>
      </form>

      <div className="mt-4 text-center text-[11.5px] text-muted-dim">جميع الجلسات مُسجّلة لأغراض الأمان</div>
    </div>
  );
}
