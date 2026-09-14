'use client';

import { useEffect, useMemo, useState } from 'react';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import {
  type GuardianEvaluation,
  type GuardianExamResult,
  evaluationLevelLabel,
  formatScorePair,
  unwrapList,
} from '@/lib/account';
import {
  examAveragePercent,
  examPercent,
  formatDateAr,
  gradeFromPercent,
  subjectIcon,
} from '@/lib/portal';
import { cn } from '@/lib/cn';

const th = 'px-[18px] py-2.5 text-right text-[11.5px] font-bold text-ink-dim';

export default function PortalReportsPage() {
  const { selectedStudent } = usePortal();
  const studentId = selectedStudent?.id;
  const [exams, setExams] = useState<GuardianExamResult[]>([]);
  const [evals, setEvals] = useState<GuardianEvaluation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setExams([]);
      setEvals([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [examRes, evalRes] = await Promise.all([
          fetch(`/api/guardian/students/${studentId}/exam-results?per_page=50`, { cache: 'no-store' }),
          fetch(`/api/guardian/students/${studentId}/evaluations?per_page=50`, { cache: 'no-store' }),
        ]);
        if (cancelled) return;
        if (examRes.ok) setExams(unwrapList<GuardianExamResult>(await examRes.json()));
        else setExams([]);
        if (evalRes.ok) setEvals(unwrapList<GuardianEvaluation>(await evalRes.json()));
        else setEvals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const avg = examAveragePercent(exams);
  const overall = avg != null ? gradeFromPercent(avg) : null;

  const subjectRows = useMemo(() => {
    const map = new Map<
      string,
      { exams: number[]; hw: number[]; levels: string[] }
    >();
    for (const row of exams) {
      const name = row.exam?.class_offering?.subject?.name ?? 'اختبارات';
      const bucket = map.get(name) ?? { exams: [], hw: [], levels: [] };
      const pct = examPercent(row);
      if (pct != null) bucket.exams.push(pct);
      map.set(name, bucket);
    }
    for (const ev of evals) {
      const name = ev.class_offering?.subject?.name ?? 'تقييمات';
      const bucket = map.get(name) ?? { exams: [], hw: [], levels: [] };
      if (typeof ev.homework_rating === 'number' && ev.homework_rating >= 1) {
        bucket.hw.push(ev.homework_rating);
      }
      if (ev.level_rating) bucket.levels.push(ev.level_rating);
      map.set(name, bucket);
    }
    return [...map.entries()].map(([name, b]) => {
      const examAvg = b.exams.length
        ? Math.round(b.exams.reduce((a, n) => a + n, 0) / b.exams.length)
        : null;
      const hwAvg = b.hw.length
        ? Math.round((b.hw.reduce((a, n) => a + n, 0) / b.hw.length) * 10) / 10
        : null;
      const grade = examAvg != null ? gradeFromPercent(examAvg) : null;
      return { name, examAvg, hwAvg, grade };
    });
  }, [exams, evals]);

  const notes = evals.filter((e) => e.note?.trim());

  return (
    <PortalPage title="التقارير" crumb="الأداء الأكاديمي من التقييمات ونتائج الاختبارات">
      <div className="flex flex-wrap items-center gap-[18px] rounded-[20px] border border-gold/40 bg-[radial-gradient(120%_120%_at_85%_10%,#1c2f63,#0b234a_62%)] p-[22px] text-white">
        <div className="min-w-[180px] flex-1">
          <div className="text-[12.5px] text-muted">متوسط الاختبارات المسجّلة</div>
          <div className="mt-2 flex items-end gap-2.5">
            <span className="font-latin text-[56px] font-bold leading-[.85] text-gold-soft">
              {avg ?? '—'}
            </span>
            <span className="mb-2 text-[15px] text-muted">
              {overall ? `من 100 · تقدير ${overall.label}` : 'لا نتائج بعد'}
            </span>
          </div>
        </div>
      </div>

      {loading ? <p className="text-[13px] text-ink-dim">جاري تحميل التقارير…</p> : null}

      <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
        <div className="border-b border-[#f0ece1] px-[18px] py-3.5">
          <h2 className="font-display text-[16.5px] font-bold text-navy-800">تقرير المواد</h2>
        </div>
        {subjectRows.length === 0 ? (
          <p className="px-[18px] py-8 text-[13px] text-ink-dim">لا توجد تقييمات أو نتائج بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="bg-cream-soft">
                  <th className={th}>المادة</th>
                  <th className={th}>الاختبارات</th>
                  <th className={th}>الواجبات</th>
                  <th className={th}>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((r) => (
                  <tr key={r.name} className="border-t border-[#f4f1ea]">
                    <td className="whitespace-nowrap px-[18px] py-3.5 text-[13.5px] font-bold text-ink">
                      <Icon name={subjectIcon(r.name)} className="me-2 text-[12px] text-gold-deep" />
                      {r.name}
                    </td>
                    <td className="font-latin px-[18px] py-3.5 text-[13.5px] text-ink-soft">
                      {r.examAvg != null ? `${r.examAvg}%` : '—'}
                    </td>
                    <td className="font-latin px-[18px] py-3.5 text-[13.5px] text-ink-soft">
                      {r.hwAvg != null ? `${r.hwAvg}/5` : '—'}
                    </td>
                    <td className="px-[18px] py-3.5">
                      {r.grade ? (
                        <span
                          className={cn(
                            'inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold',
                            r.grade.tone === 'good'
                              ? 'bg-[#e9f3ec] text-[#2e7d4f]'
                              : r.grade.tone === 'mid'
                                ? 'bg-[#f7f0e1] text-gold-deep'
                                : 'bg-[#f8ecec] text-[#a34b4b]',
                          )}
                        >
                          {r.grade.label}
                        </span>
                      ) : (
                        <span className="text-[13px] text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">ملاحظات المعلمين</h2>
          {notes.length === 0 ? (
            <p className="text-[13px] text-ink-dim">لا توجد ملاحظات مسجّلة.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notes.map((n) => (
                <div key={n.id} className="rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <b className="text-[13px] text-navy-800">
                      {[n.creator?.name, n.class_offering?.subject?.name].filter(Boolean).join(' — ') ||
                        'المعلم'}
                    </b>
                    <span className="text-[11px] text-ink-faint">{formatDateAr(n.created_at)}</span>
                  </div>
                  {n.level_rating ? (
                    <span className="mt-1 inline-block text-[11px] text-gold-deep">
                      {evaluationLevelLabel(n.level_rating)}
                      {formatScorePair(n.numeric_score, n.numeric_score_max)
                        ? ` · ${formatScorePair(n.numeric_score, n.numeric_score_max)}`
                        : ''}
                    </span>
                  ) : null}
                  <p className="mt-2 text-[12.5px] leading-[1.8] text-ink-soft">{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">نتائج الاختبارات</h2>
          {exams.length === 0 ? (
            <p className="text-[13px] text-ink-dim">لا توجد نتائج اختبارات بعد.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {exams.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3"
                >
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gold/[.14] text-gold-deep">
                    <Icon name="fa-solid fa-clipboard-check" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-ink">{row.exam?.name ?? `اختبار #${row.exam_id}`}</div>
                    <div className="mt-0.5 text-[11px] text-ink-faint">
                      {[row.exam?.class_offering?.subject?.name, formatDateAr(row.exam?.exam_date)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <span className="font-latin whitespace-nowrap text-[14px] font-bold text-navy-800">
                    {formatScorePair(row.score, row.exam?.max_score) ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalPage>
  );
}
