'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StudentSchedule from '@/components/account/StudentSchedule';
import { type Student, unwrapList } from '@/lib/account';

export default function SchedulePageClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/guardian/students');
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || 'تعذّر تحميل الأبناء');
          return;
        }
        const list = unwrapList<Student>(json);
        setStudents(list);
        if (list[0]) setStudentId(String(list[0].id));
      } catch {
        setError('حدث خطأ في الاتصال');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>;
  if (error) return <p className="text-[14px] text-[#a34b4b]">{error}</p>;

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ece6d8] bg-white p-6 text-center">
        <p className="text-[14px] text-[#8a8478]">لا يوجد أبناء مرتبطون بالحساب.</p>
        <Link href="/portal/children" className="mt-3 inline-block text-[13px] font-bold text-navy-800">
          العودة لأبنائي
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold">الجدول الدراسي</h2>
          <p className="text-[13px] text-[#8a8478]">عرض يومي / أسبوعي / شهري لحصص الأبناء</p>
        </div>
        {students.length > 1 ? (
          <select
            className="rounded-xl border border-[#e5dfd0] bg-white px-3 py-2 text-[13px] font-bold text-navy-800"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[13px] font-bold text-navy-800">{students[0]?.full_name}</p>
        )}
      </div>

      {studentId ? <StudentSchedule key={studentId} studentId={studentId} /> : null}
    </div>
  );
}
