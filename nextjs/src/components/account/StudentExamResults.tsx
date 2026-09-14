'use client';

import { useCallback, useEffect, useState } from 'react';
import { type GuardianExamResult, formatScorePair, unwrapList } from '@/lib/account';
import { cn } from '@/lib/cn';

function scoreTone(score: string | number | null | undefined, max: string | number | null | undefined) {
  if (score === null || score === undefined || max === null || max === undefined) return '';
  const s = Number(score);
  const m = Number(max);
  if (Number.isNaN(s) || Number.isNaN(m) || m <= 0) return '';
  return (s / m) * 100 >= 80 ? 'text-[#2e7d4f]' : '';
}

export default function StudentExamResults({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<GuardianExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guardian/students/${studentId}/exam-results?per_page=50`);
      if (res.ok) setRows(unwrapList<GuardianExamResult>(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-extrabold">نتائج الاختبارات</h3>

      {loading ? (
        <p className="text-[13px] text-[#8a8478]">جاري تحميل النتائج…</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[#8a8478]">لا توجد نتائج اختبارات بعد.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const exam = row.exam;
            const scoreText = formatScorePair(row.score, exam?.max_score);
            const hasScore = scoreText !== null;

            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8f5ee] px-3.5 py-3 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#1c1a17]">{exam?.name ?? `اختبار #${row.exam_id}`}</p>
                  <p className="mt-0.5 text-[12px] text-[#8a8478]">
                    {exam?.class_offering?.subject?.name ?? '—'}
                    {exam?.exam_date ? ` · ${exam.exam_date}` : ''}
                  </p>
                </div>

                <div className="shrink-0 text-left" dir="ltr">
                  {hasScore ? (
                    <span
                      className={cn(
                        'font-latin text-[14px] font-extrabold text-navy-800',
                        scoreTone(row.score, exam?.max_score),
                      )}
                    >
                      {scoreText}
                    </span>
                  ) : row.teacher_notes ? (
                    <span className="block max-w-[220px] text-right text-[12.5px] leading-snug text-[#8a8478]" dir="rtl">
                      {row.teacher_notes}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#a39e93]">—</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
