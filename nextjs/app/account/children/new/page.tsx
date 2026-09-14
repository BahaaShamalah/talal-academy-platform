'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accountField, accountLabel, type Grade, unwrapList, unwrapOne, apiErrorMessage } from '@/lib/account';
import type { Student } from '@/lib/account';

export default function NewChildPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dob, setDob] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/public/grades');
      if (res.ok) setGrades(unwrapList<Grade>(await res.json()));
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        full_name: fullName.trim(),
        gender,
      };
      if (dob) body.date_of_birth = dob;
      if (gradeId) body.current_grade_id = Number(gradeId);

      const res = await fetch('/api/guardian/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(apiErrorMessage(json, 'تعذّر إضافة الطالب'));
        return;
      }
      const student = unwrapOne<Student>(json);
      if (student?.id) {
        router.replace(`/account/children/${student.id}`);
      } else {
        router.replace('/account');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[520px] space-y-5">
      <div>
        <Link href="/account" className="text-[13px] text-[#8a8478]">
          ← رجوع
        </Link>
        <h2 className="mt-2 text-[22px] font-extrabold">إضافة ابن/ابنة</h2>
        <p className="text-[13px] text-[#8a8478]">بيانات الطالب فقط — الاشتراك لاحقًا من صفحة التفاصيل</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-[#ece6d8] bg-white p-5">
        <div>
          <label className={accountLabel}>الاسم الكامل</label>
          <input className={accountField} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className={accountLabel}>الجنس</label>
          <select
            className={accountField}
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
          >
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
        <div>
          <label className={accountLabel}>تاريخ الميلاد (اختياري)</label>
          <input
            type="date"
            className={accountField}
            dir="ltr"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
        <div>
          <label className={accountLabel}>الصف</label>
          <select
            className={accountField}
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
          >
            <option value="">اختر الصف</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3 text-[15px] font-extrabold text-navy"
        >
          {loading ? 'جاري الحفظ…' : 'حفظ ومتابعة'}
        </button>
      </form>
    </div>
  );
}
