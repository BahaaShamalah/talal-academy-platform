'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { CreateEvaluationModal } from '@/components/evaluations/create-evaluation-modal';
import { TeachingScheduleCalendar } from '@/components/my-portal/teaching-schedule-calendar';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  formatKwd,
  qs,
  type Evaluation,
  type ClassOffering,
  type LeaveBalance,
  type Paginated,
  type PayrollItem,
  type Student,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const PORTAL_SECTION_IDS: Record<string, string> = {
  students: 'portal-students',
  evaluations: 'portal-evaluations',
};
type StudentRow = {
  id: number;
  full_name: string;
  file_number: string;
  gradeName: string;
  subjects: string[];
};

function monthLabel(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-KW', { month: 'long', year: 'numeric' });
}

function evaluationSummary(ev: Evaluation): string {
  if (ev.numeric_score != null && ev.numeric_score !== '') {
    const max = ev.numeric_score_max ?? 10;
    return `${ev.numeric_score} / ${max}`;
  }
  if (ev.level_rating) {
    const labels: Record<string, string> = {
      excellent: 'ممتاز',
      good: 'جيد',
      needs_follow_up: 'يحتاج متابعة',
    };
    return labels[ev.level_rating] ?? ev.level_rating;
  }
  return 'تقييم';
}

function toStudentRows(students: Student[]): StudentRow[] {
  return students
    .map((student) => {
      const subjects = [
        ...new Set(
          (student.enrollments ?? [])
            .map((e) => e.class_offering?.subject?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ];
      return {
        id: student.id,
        full_name: student.full_name,
        file_number: student.file_number,
        gradeName:
          student.current_grade?.name ??
          student.enrollments?.[0]?.class_offering?.grade?.name ??
          '—',
        subjects,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
}

export function MyPortalPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.roles.includes('teacher') ?? false;
  const canViewPortal = useAuthStore((s) => s.hasPermission('teacher-portal.view'));
  const canViewClasses = useAuthStore((s) => s.hasPermission('teacher-portal.classes'));
  const canViewPayroll = useAuthStore((s) => s.hasPermission('teacher-portal.payroll'));
  const canViewLeaves = useAuthStore((s) => s.hasPermission('teacher-portal.leaves'));
  const canManageEvaluations = useAuthStore((s) => s.hasPermission('evaluations.manage'));
  const searchParams = useSearchParams();
  const [studentSearch, setStudentSearch] = useState('');
  const [showAllEvaluations, setShowAllEvaluations] = useState(false);
  const [evalModal, setEvalModal] = useState<{
    open: boolean;
    studentId?: number;
    classOfferingId?: number;
  }>({ open: false });

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const targetId = PORTAL_SECTION_IDS[section];
    if (!targetId) return;

    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const portalReady = isTeacher && canViewPortal;

  const groupsQuery = useQuery({
    queryKey: ['me-groups'],
    queryFn: async () => {
      const res = await apiClient<{ data: ClassOffering[] } | ClassOffering[]>('/me/groups');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: portalReady,
    staleTime: 60_000,
  });

  const studentsQuery = useQuery({
    queryKey: ['me-students'],
    queryFn: async () => {
      const res = await apiClient<{ data: Student[] } | Student[]>('/me/students');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: portalReady,
    staleTime: 60_000,
  });

  const evaluationsQuery = useQuery({
    queryKey: ['me-evaluations'],
    queryFn: () =>
      apiClient<Paginated<Evaluation>>(
        `/me/evaluations${qs({
          include: 'student,classOffering.subject,classOffering.grade',
          per_page: 50,
        })}`,
      ),
    enabled: portalReady,
    staleTime: 60_000,
  });

  const leaveQuery = useQuery({
    queryKey: ['me-leave-balances'],
    queryFn: async () => {
      const res = await apiClient<{ data: LeaveBalance[] } | LeaveBalance[]>('/me/leave-balances');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: portalReady && canViewLeaves,
    staleTime: 60_000,
  });

  const payrollQuery = useQuery({
    queryKey: ['me-payroll-items', 'latest'],
    queryFn: () =>
      apiClient<Paginated<PayrollItem>>(`/me/payroll-items${qs({ per_page: 1 })}`),
    enabled: portalReady && canViewPayroll,
    staleTime: 120_000,
  });

  const groups = groupsQuery.data ?? [];
  const studentRows = useMemo(
    () => toStudentRows(studentsQuery.data ?? []),
    [studentsQuery.data],
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentRows;
    return studentRows.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.file_number.toLowerCase().includes(q),
    );
  }, [studentRows, studentSearch]);

  const evaluations = evaluationsQuery.data?.data ?? [];
  const visibleEvaluations = showAllEvaluations ? evaluations : evaluations.slice(0, 6);

  const leaveRemaining = (leaveQuery.data ?? []).reduce(
    (sum, b) => sum + (b.remaining_days ?? 0),
    0,
  );

  const lastPayroll = payrollQuery.data?.data?.[0] ?? null;
  const firstOfferingId = groups[0]?.id;

  if (!isTeacher || !canViewPortal) {
    return (
      <>
        <AdminHeader title="بوابة المعلم" crumb="غير متاح" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-user-lock"
            title={!isTeacher ? 'هذه الصفحة للمعلمين' : 'غير مصرح'}
            body={
              !isTeacher
                ? 'لا يوجد دور معلم مرتبط بحسابك.'
                : 'ليس لديك صلاحية عرض بوابة المعلم.'
            }
          />
        </AdminContent>
      </>
    );
  }

  const loadingHeader =
    groupsQuery.isLoading || studentsQuery.isLoading || leaveQuery.isLoading;

  return (
    <>
      <AdminHeader title="بوابتي" />

      <AdminContent className="space-y-3 sm:space-y-4">
        {/* Welcome + stats */}
        <section className="rounded-[18px] border border-cream-line bg-white p-3.5 sm:rounded-[20px] sm:p-5">
          <div>
            <p className="text-[12px] font-bold text-gold">مرحباً</p>
            <h1 className="mt-0.5 font-display text-[22px] font-extrabold leading-snug text-navy sm:text-[26px]">
              {user?.name ?? 'معلم'}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {firstOfferingId ? (
                <Link
                  href={`/dashboard/class-offerings/${firstOfferingId}/sessions`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1.5 text-[12px] font-extrabold text-white"
                >
                  <Icon name="fa-solid fa-clipboard-user" className="text-[11px]" />
                  أخذ الحضور
                </Link>
              ) : null}
              {canManageEvaluations ? (
                <button
                  type="button"
                  onClick={() => setEvalModal({ open: true })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-cream-soft px-3.5 py-1.5 text-[12px] font-bold text-navy"
                >
                  <Icon name="fa-solid fa-star" className="text-[11px] text-gold" />
                  تقييم جديد
                </button>
              ) : null}
              {canViewLeaves ? (
                <Link
                  href="/dashboard/my-leaves"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-cream-soft px-3.5 py-1.5 text-[12px] font-bold text-navy"
                >
                  <Icon name="fa-solid fa-plane-departure" className="text-[11px] text-gold" />
                  طلب إجازة
                </Link>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'mt-3.5 grid gap-2 sm:mt-4 sm:gap-3',
              'grid-cols-2 sm:grid-cols-3',
            )}
          >
            {(
              [
                canViewClasses
                  ? {
                      label: 'صفوفي',
                      value: loadingHeader ? '…' : String(groups.length),
                      targetId: null as string | null,
                      href: '/dashboard/my-classes' as string | null,
                      icon: 'fa-solid fa-chalkboard-user',
                    }
                  : null,
                {
                  label: 'طلابي',
                  value: loadingHeader ? '…' : String(studentRows.length),
                  targetId: 'portal-students' as string | null,
                  href: null as string | null,
                  icon: 'fa-solid fa-graduation-cap',
                },
                canViewLeaves
                  ? {
                      label: 'إجازاتي',
                      value: leaveQuery.isLoading ? '…' : `${leaveRemaining}`,
                      targetId: null as string | null,
                      href: '/dashboard/my-leaves' as string | null,
                      icon: 'fa-solid fa-plane-departure',
                    }
                  : null,
              ] as const
            )
              .filter((stat): stat is NonNullable<typeof stat> => Boolean(stat))
              .map((stat) => {
              const cardClass =
                'block w-full rounded-2xl border border-cream-line bg-cream-soft px-2.5 py-3 text-start transition-colors hover:border-gold/40 hover:bg-white sm:px-4 sm:py-4';
              const body = (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold sm:gap-1.5 sm:text-[12px]">
                    <Icon name={stat.icon} className="text-[11px] sm:text-[13px]" />
                    {stat.label}
                  </span>
                  <p className="mt-2 text-[22px] font-extrabold leading-none text-navy sm:mt-3 sm:text-[32px]">
                    {stat.value}
                  </p>
                </>
              );

              if (stat.href) {
                return (
                  <Link key={stat.label} href={stat.href} className={cardClass}>
                    {body}
                  </Link>
                );
              }

              return (
                <button
                  key={stat.label}
                  type="button"
                  className={cardClass}
                  onClick={() => {
                    const el = document.getElementById(stat.targetId!);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </section>


        {/* Schedule first — daily work */}
        <TeachingScheduleCalendar />

        {/* Students + evaluations side by side on large screens */}
        <div className="grid gap-4 lg:grid-cols-5">
          <section
            id="portal-students"
            className="scroll-mt-24 overflow-hidden rounded-[18px] border border-cream-line bg-white lg:col-span-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] px-4 py-3">
              <h2 className="text-[15px] font-extrabold text-navy-800">طلابي</h2>
              <input
                type="search"
                placeholder="بحث…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full max-w-[200px] rounded-full border border-cream-line2 bg-cream-soft px-3 py-1.5 text-[12.5px] focus:border-gold focus:outline-none"
              />
            </div>

            {studentsQuery.isLoading ? (
              <div className="p-5 text-[13px] text-ink-dim">جاري التحميل…</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-2">
                <EmptyState
                  icon="fa-solid fa-user-graduate"
                  title="لا طلاب"
                  body={studentSearch ? 'لا نتائج مطابقة.' : 'لا يوجد طلاب في شعبك.'}
                />
              </div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-[#f4f1ea] overflow-y-auto">
                {filteredStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream-soft/70"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/student-files/${s.id}`}
                        className="block truncate text-[13.5px] font-bold text-navy-800 hover:underline"
                      >
                        {s.full_name}
                      </Link>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-dim">
                        <span className="font-latin">{s.file_number}</span>
                        <span className="mx-1">·</span>
                        {s.gradeName}
                        {s.subjects.length > 0 ? (
                          <>
                            <span className="mx-1">·</span>
                            {s.subjects.join('، ')}
                          </>
                        ) : null}
                      </p>
                    </div>
                    {canManageEvaluations ? (
                      <button
                        type="button"
                        onClick={() => setEvalModal({ open: true, studentId: s.id })}
                        className="shrink-0 rounded-full border border-cream-line2 px-2.5 py-1 text-[11px] font-bold text-gold-deep hover:bg-white"
                      >
                        تقييم
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            id="portal-evaluations"
            className="scroll-mt-24 overflow-hidden rounded-[18px] border border-cream-line bg-white lg:col-span-2"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#f0ece1] px-4 py-3">
              <h2 className="text-[15px] font-extrabold text-navy-800">تقييماتي</h2>
              {canManageEvaluations ? (
                <button
                  type="button"
                  onClick={() => setEvalModal({ open: true })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-navy"
                  title="تقييم جديد"
                >
                  <Icon name="fa-solid fa-plus" className="text-[11px]" />
                </button>
              ) : null}
            </div>

            {evaluationsQuery.isLoading ? (
              <div className="p-5 text-[13px] text-ink-dim">جاري التحميل…</div>
            ) : visibleEvaluations.length === 0 ? (
              <div className="p-2">
                <EmptyState
                  icon="fa-solid fa-star"
                  title="لا تقييمات"
                  body="أضف أول تقييم لطالبك."
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-[#f4f1ea]">
                  {visibleEvaluations.map((ev) => (
                    <li key={ev.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink">
                            {ev.student?.full_name ?? `طالب #${ev.student_id}`}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-ink-dim">
                            {ev.class_offering?.subject?.name ?? 'مادة'}
                            <span className="mx-1">·</span>
                            {ev.created_at
                              ? new Date(ev.created_at).toLocaleDateString('ar-KW')
                              : '—'}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-cream-soft px-2 py-0.5 text-[11px] font-bold text-navy-800">
                          {evaluationSummary(ev)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {evaluations.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllEvaluations((v) => !v)}
                    className="w-full border-t border-[#f0ece1] py-2.5 text-[12px] font-bold text-gold-deep hover:bg-cream-soft"
                  >
                    {showAllEvaluations ? 'عرض أقل' : `عرض الكل (${evaluations.length})`}
                  </button>
                ) : null}
              </>
            )}
          </section>
        </div>

        {/* Payroll + leaves */}
        {canViewPayroll || canViewLeaves ? (
          <section
            className={cn(
              'grid gap-3',
              canViewPayroll && canViewLeaves ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
            )}
          >
            {canViewPayroll ? (
              <Link
                href="/dashboard/my-payroll"
                className="group flex items-center justify-between gap-3 rounded-[18px] border border-cream-line bg-white p-4 transition-colors hover:border-gold/40 hover:bg-cream-soft"
              >
                <div>
                  <p className="text-[11px] font-bold text-gold">راتبي</p>
                  <h3 className="mt-0.5 text-[14.5px] font-extrabold text-navy-800">آخر راتب</h3>
                  {payrollQuery.isLoading ? (
                    <p className="mt-1.5 text-[13px] text-ink-dim">…</p>
                  ) : lastPayroll ? (
                    <p className="font-latin mt-1.5 text-[16px] font-extrabold text-navy">
                      {lastPayroll.net_amount != null ? formatKwd(lastPayroll.net_amount) : '—'}
                      <span className="ms-1.5 text-[11.5px] font-bold text-ink-dim">
                        {monthLabel(lastPayroll.payroll_run?.period_month)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[12.5px] text-ink-dim">لا سجلات بعد</p>
                  )}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-soft text-gold transition-colors group-hover:bg-white">
                  <Icon name="fa-solid fa-wallet" className="text-[15px]" />
                </span>
              </Link>
            ) : null}

            {canViewLeaves ? (
              <Link
                href="/dashboard/my-leaves"
                className="group flex items-center justify-between gap-3 rounded-[18px] border border-cream-line bg-white p-4 transition-colors hover:border-gold/40 hover:bg-cream-soft"
              >
                <div>
                  <p className="text-[11px] font-bold text-gold">إجازاتي</p>
                  <h3 className="mt-0.5 text-[14.5px] font-extrabold text-navy-800">رصيد الإجازات</h3>
                  {leaveQuery.isLoading ? (
                    <p className="mt-1.5 text-[13px] text-ink-dim">…</p>
                  ) : (leaveQuery.data ?? []).length === 0 ? (
                    <p className="mt-1.5 text-[12.5px] text-ink-dim">لا أرصدة مسجّلة</p>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-ink-soft">
                      متبقي{' '}
                      <span className="font-extrabold text-navy-800">{leaveRemaining} يوم</span>
                    </p>
                  )}
                  <p className="mt-2 text-[11.5px] font-bold text-gold-deep">طلب إجازة ←</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-soft text-gold transition-colors group-hover:bg-white">
                  <Icon name="fa-solid fa-plane-departure" className="text-[15px]" />
                </span>
              </Link>
            ) : null}
          </section>
        ) : null}
      </AdminContent>

      <CreateEvaluationModal
        open={evalModal.open}
        onClose={() => setEvalModal({ open: false })}
        studentId={evalModal.studentId}
        classOfferingId={evalModal.classOfferingId}
        onCreated={() => {
          void evaluationsQuery.refetch();
        }}
      />
    </>
  );
}
