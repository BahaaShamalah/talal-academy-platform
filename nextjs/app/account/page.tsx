'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  type Student,
  hasActiveSubscription,
  subscriptionBadge,
  unwrapList,
} from '@/lib/account';
import Icon from '@/components/ui/Icon';

export default function AccountHomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        '/api/guardian/students?include=currentGrade,planSubscriptions,planSubscriptions.plan&per_page=50',
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر تحميل الأبناء');
        return;
      }
      setStudents(unwrapList<Student>(json));
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold">أبنائي</h2>
          <p className="text-[13px] text-[#8a8478]">إدارة الأبناء والاشتراكات من مكان واحد</p>
        </div>
        <Link
          href="/account/children/new"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[14px] font-extrabold text-navy shadow-gold"
        >
          <Icon name="fa-solid fa-plus" />
          إضافة ابن/ابنة
        </Link>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>
      ) : error ? (
        <p className="text-[14px] text-[#a34b4b]">{error}</p>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d1bc] bg-white/70 px-6 py-12 text-center">
          <p className="text-[16px] font-extrabold">لا يوجد أبناء مسجلين بعد</p>
          <p className="mt-1 text-[13px] text-[#8a8478]">أضف ابنك أو ابنتك للبدء في الاشتراك والمتابعة</p>
          <Link
            href="/account/children/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy-800 px-6 py-3 text-[14px] font-extrabold text-gold"
          >
            <Icon name="fa-solid fa-plus" />
            إضافة ابن/ابنة
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {students.map((s) => {
            const badge = subscriptionBadge(s);
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-[#ece6d8] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(0,0,0,.35)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[16px] font-extrabold">{s.full_name}</h3>
                    <p className="mt-0.5 text-[13px] text-[#8a8478]">
                      {s.current_grade?.name ?? 'بدون صف'}
                      {s.file_number ? ` · ${s.file_number}` : ''}
                    </p>
                  </div>
                  <span
                    className={
                      badge.tone === 'ok'
                        ? 'rounded-full bg-[#e7f5ec] px-2.5 py-1 text-[11px] font-bold text-[#2e7d4f]'
                        : badge.tone === 'warn'
                          ? 'rounded-full bg-[#fff6db] px-2.5 py-1 text-[11px] font-bold text-[#8a6a20]'
                          : 'rounded-full bg-[#f0ebe0] px-2.5 py-1 text-[11px] font-bold text-[#8a8478]'
                    }
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/account/children/${s.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-[#ece6d8] px-3 py-2 text-[13px] font-bold"
                  >
                    التفاصيل
                  </Link>
                  {!hasActiveSubscription(s) ? (
                    <Link
                      href={`/account/children/${s.id}/subscribe`}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-navy-800 px-3 py-2 text-[13px] font-bold text-gold"
                    >
                      اشتراك
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
