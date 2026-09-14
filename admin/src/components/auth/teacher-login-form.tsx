'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { normalizeAuthUser } from '@/lib/normalize-user';
import { isTeacherOnly } from '@/lib/dashboard-routes';
import { Icon } from '@/components/ui/icon';

const field =
  'w-full rounded-xl border border-[#d8e0ea] bg-[#f7f9fc] py-3 pl-3.5 pr-10 text-[14px] text-[#1a2332] focus:border-[#2a6b6b] focus:bg-white focus:outline-none';

export function TeacherLoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      if (isTeacherOnly(user)) {
        router.replace('/dashboard/my-portal');
      } else {
        router.replace('/dashboard');
      }
      router.refresh();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#d8e0ea]">
          <Image
            src="/assets/talal-symbol.png"
            alt="طلال أكاديمي"
            width={42}
            height={42}
            className="object-contain"
          />
        </div>
        <h1 className="font-display mt-4 text-[28px] font-bold text-[#0f2a3d]">بوابة المعلم</h1>
        <p className="mt-1.5 text-[13.5px] text-[#5a6b7a]">سجّل دخولك لمتابعة شعبك وجدولك وطلابك</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[#d8e0ea] bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,42,61,.35)]"
      >
        <label htmlFor="teacher-email" className="mb-1.5 block text-[12.5px] font-semibold text-[#3d4f5f]">
          البريد الإلكتروني
        </label>
        <div className="relative mb-3.5">
          <Icon
            name="fa-solid fa-envelope"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#9aabba]"
          />
          <input
            id="teacher-email"
            type="email"
            required
            dir="ltr"
            placeholder="teacher@example.com"
            className={`${field} text-left`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <label htmlFor="teacher-password" className="mb-1.5 block text-[12.5px] font-semibold text-[#3d4f5f]">
          كلمة المرور
        </label>
        <div className="relative mb-5">
          <Icon
            name="fa-solid fa-lock"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#9aabba]"
          />
          <input
            id="teacher-password"
            type="password"
            required
            placeholder="••••••••"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <p className="mb-3 rounded-xl bg-[#f8ecec] px-3 py-2 text-[13px] text-[#a34b4b]">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a5c5c] py-3.5 text-[15px] font-extrabold text-white transition-colors hover:bg-[#154949] disabled:opacity-70"
        >
          <Icon name="fa-solid fa-chalkboard-user" className="text-[14px]" />
          {loading ? 'جاري الدخول…' : 'دخول إلى بوابتي'}
        </button>
      </form>

      <p className="mt-5 text-center text-[12px] text-[#7a8a98]">معهد طلال أكاديمي — بوابة المعلمين</p>
    </div>
  );
}
