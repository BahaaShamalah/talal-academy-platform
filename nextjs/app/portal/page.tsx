'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalPage from '@/components/portal/PortalPage';
import Icon from '@/components/ui/Icon';
import { usePortal } from '@/components/portal/PortalProvider';
import {
  type GuardianEducationalMaterial,
  type GuardianEvaluation,
  type GuardianExamResult,
  statusLabel,
  unwrapList,
} from '@/lib/account';
import type { ScheduleSession } from '@/components/account/StudentSchedule';
import { formatTimeRange12h } from '@/lib/time';
import {
  examAveragePercent,
  homeworkAverage,
  portalQuickActions,
  primarySubscription,
  subjectColor,
  subjectExamAverages,
  subjectIcon,
  todayIso,
} from '@/lib/portal';
import { cn } from '@/lib/cn';

type AttendanceSummary = {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
};

export default function PortalDashboardPage() {
  const { selectedStudent } = usePortal();
  const studentId = selectedStudent?.id;

  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [exams, setExams] = useState<GuardianExamResult[]>([]);
  const [evals, setEvals] = useState<GuardianEvaluation[]>([]);
  const [materialsCount, setMaterialsCount] = useState<number | null>(null);
  const [todaySessions, setTodaySessions] = useState<ScheduleSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setAttendance(null);
      setExams([]);
      setEvals([]);
      setMaterialsCount(null);
      setTodaySessions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const date = todayIso();
        const [attRes, examRes, evalRes, matRes, schRes] = await Promise.all([
          fetch(`/api/guardian/students/${studentId}/attendance-summary`, { cache: 'no-store' }),
          fetch(`/api/guardian/students/${studentId}/exam-results?per_page=50`, { cache: 'no-store' }),
          fetch(`/api/guardian/students/${studentId}/evaluations?per_page=50`, { cache: 'no-store' }),
          fetch(`/api/guardian/students/${studentId}/educational-materials`, { cache: 'no-store' }),
          fetch(`/api/guardian/students/${studentId}/schedule?view=day&date=${date}`, {
            cache: 'no-store',
          }),
        ]);

        if (cancelled) return;

        if (attRes.ok) {
          const att = await attRes.json();
          setAttendance(att.summary ?? null);
        } else setAttendance(null);

        if (examRes.ok) setExams(unwrapList<GuardianExamResult>(await examRes.json()));
        else setExams([]);

        if (evalRes.ok) setEvals(unwrapList<GuardianEvaluation>(await evalRes.json()));
        else setEvals([]);

        if (matRes.ok) setMaterialsCount(unwrapList<GuardianEducationalMaterial>(await matRes.json()).length);
        else setMaterialsCount(null);

        if (schRes.ok) {
          const sch = await schRes.json();
          setTodaySessions((sch.sessions ?? []) as ScheduleSession[]);
        } else setTodaySessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const sub = primarySubscription(selectedStudent);
  const examAvg = examAveragePercent(exams);
  const hwAvg = homeworkAverage(evals);
  const subjectScores = subjectExamAverages(exams);
  const attTotal = attendance?.total_sessions ?? 0;
  const attPresent = (attendance?.present ?? 0) + (attendance?.late ?? 0);
  const attRate = attendance?.attendance_rate ?? 0;

  const attBars = attendance
    ? [
        { label: 'حضور', value: attendance.present, color: '#2e7d4f' },
        { label: 'تأخير', value: attendance.late, color: '#8a6a20' },
        { label: 'بعذر', value: attendance.excused, color: '#1c4b8f' },
        { label: 'غياب', value: attendance.absent, color: '#a34b4b' },
      ]
    : [];
  const attMax = Math.max(1, ...attBars.map((b) => b.value));

  const stats = [
    {
      icon: 'fa-solid fa-calendar-check',
      value: attTotal ? `${attPresent}/${attTotal}` : '—',
      label: 'الحضور',
      trend: attTotal ? `${Math.round(attRate)}%` : 'لا بيانات',
      up: attRate >= 80,
      pct: attRate,
      color: '#2e7d4f',
    },
    {
      icon: 'fa-solid fa-book-open',
      value: materialsCount != null ? String(materialsCount) : '—',
      label: 'المواد التعليمية',
      trend: hwAvg != null ? `واجبات ${hwAvg}/5` : 'الملفات المتاحة',
      up: true,
      pct: materialsCount ? 100 : 0,
      color: '#1c4b8f',
    },
    {
      icon: 'fa-solid fa-star',
      value: examAvg != null ? `${examAvg}%` : '—',
      label: 'متوسط الاختبارات',
      trend: exams.length ? `${exams.length} نتيجة` : 'لا نتائج بعد',
      up: (examAvg ?? 0) >= 80,
      pct: examAvg ?? 0,
      color: '#8a6a20',
    },
    {
      icon: 'fa-solid fa-wallet',
      value: sub ? statusLabel(sub.status) : '—',
      label: 'حالة الاشتراك',
      trend: sub?.plan?.name ?? 'لا يوجد اشتراك',
      up: sub?.status === 'active',
      pct: sub?.status === 'active' ? 100 : sub ? 40 : 0,
      color: '#5c4a7a',
    },
  ];

  return (
    <PortalPage title="لوحة الطالب" crumb="نظرة عامة على تقدّم ابنك">
      {loading ? (
        <p className="text-[13px] text-ink-dim">جاري تحميل بيانات الطالب…</p>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="pop rounded-[18px] border border-cream-line bg-white p-[17px] shadow-[0_10px_24px_-22px_rgba(11,35,74,.6)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
                <Icon name={s.icon} />
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  s.up ? 'bg-[#e9f3ec] text-[#2e7d4f]' : 'bg-[#f0eef4] text-[#5c4a7a]',
                )}
              >
                {s.trend}
              </span>
            </div>
            <div className="mt-3.5 text-[26px] font-bold leading-none text-navy-800">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] text-ink-soft">{s.label}</div>
            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#f0ece1]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, s.pct))}%`, background: s.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[16.5px] font-bold text-navy-800">مستوى المواد</h2>
              <div className="mt-1 text-[11.5px] text-ink-faint">متوسط نتائج الاختبارات</div>
            </div>
          </div>
          {subjectScores.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-dim">لا توجد نتائج اختبارات بعد.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {subjectScores.map((sb) => (
                <div key={sb.name}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 text-ink">
                      <Icon name={subjectIcon(sb.name)} className="text-[12px] text-gold-deep" />
                      {sb.name}
                    </span>
                    <b className="font-latin" style={{ color: subjectColor(sb.name) }}>
                      {sb.score}%
                    </b>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0ece1]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${sb.score}%`, background: subjectColor(sb.name) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display text-[16.5px] font-bold text-navy-800">ملخص الحضور</h2>
          <div className="mt-1 text-[11.5px] text-ink-faint">من بداية التسجيل</div>
          {!attendance || attTotal === 0 ? (
            <p className="mt-4 text-[13px] text-ink-dim">لا سجلات حضور بعد.</p>
          ) : (
            <div className="relative mt-[18px] flex h-[150px] items-end gap-2.5 border-b border-[#f0ece1] pb-[22px]">
              {attBars.map((ab) => (
                <div key={ab.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="font-latin text-[10.5px] text-ink-dim">{ab.value}</span>
                  <div
                    className="w-full max-w-[34px] rounded-b-[4px] rounded-t-[9px]"
                    style={{
                      height: `${Math.round((ab.value / attMax) * 100)}%`,
                      background: ab.color,
                      minHeight: ab.value > 0 ? 8 : 2,
                    }}
                  />
                  <span className="absolute bottom-0.5 text-[10.5px] text-ink-faint">{ab.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[16.5px] font-bold text-navy-800">حصص اليوم</h2>
            <Link href="/portal/schedule" className="text-[12px] font-semibold text-gold-deep">
              الجدول الكامل ←
            </Link>
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {todaySessions.length === 0 ? (
              <p className="text-[13px] text-ink-dim">لا حصص مسجّلة اليوم.</p>
            ) : (
              todaySessions.map((t) => (
                <div
                  key={t.id}
                  className="sl flex items-center gap-3 rounded-[14px] border border-[#f0ece1] bg-cream-soft px-3.5 py-3"
                >
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-full"
                    style={{ background: subjectColor(t.subject_name) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{t.subject_name ?? 'حصة'}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-dim">
                      {[t.teacher_name, t.hall_name].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <span className="font-latin whitespace-nowrap text-[12px] text-ink-soft">
                    {formatTimeRange12h(t.start_time, t.end_time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">إجراءات سريعة</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2.5">
            {portalQuickActions.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="rounded-[15px] border border-[#f0ece1] bg-cream-soft px-2.5 py-4 text-center"
              >
                <span className="mx-auto flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
                  <Icon name={q.icon} />
                </span>
                <div className="mt-2.5 text-[12px] font-bold leading-snug text-ink">{q.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PortalPage>
  );
}
