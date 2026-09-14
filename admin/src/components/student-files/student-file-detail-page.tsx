'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  SubscriptionFreezeActions,
  SubscriptionStatusCell,
} from '@/components/student-files/subscription-freeze-actions';
import { StudentEvaluationsSection } from '@/components/student-files/student-evaluations-section';
import {
  FileNumberBadge,
  StudentStatusBadge,
} from '@/components/student-files/student-status-badge';
import {
  GENDERS,
  STATUSES,
  buildUpdatePayload,
  dobInputBounds,
  emptyStudentForm,
  genderLabel,
  normalizeKuwaitPhone,
  validateUpdateForm,
  type StudentFormState,
} from '@/components/student-files/student-shared';
import { KuwaitPhoneInput } from '@/components/student-files/kuwait-phone-input';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { openStudentFilePrint } from '@/lib/student-file-print';
import { openPrintPreviewWindow } from '@/lib/print/print-utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { SchoolSelect } from '@/components/ui/school-select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuthStore } from '@/stores/auth-store';
import {
  apiClient,
  formatKwd,
  qs,
  type CouponValidateResult,
  type Grade,
  type Guardian,
  type Paginated,
  type Plan,
  type Student,
  type StoreOrder,
  type Subscription,
  type AttendanceSummary,
} from '@/lib/api-client';

function stageLabel(student?: Student | null) {
  const grade = student?.current_grade;
  if (!grade) return '—';
  return grade.educational_stage?.name
    ? `${grade.educational_stage.name} — ${grade.name}`
    : grade.name;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#f4f1ea] bg-cream-soft/40 px-3.5 py-3">
      <div className="text-[11.5px] font-semibold text-ink-dim">{label}</div>
      <div className="mt-1 text-[13.5px] font-medium text-ink">{value || '—'}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#f0ece1] px-4 py-3.5">
        <h2 className="text-[15px] font-bold text-navy-800">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function durationLabel(sub: Subscription) {
  if (!sub.ends_at && sub.plan?.duration_type === 'monthly_recurring') {
    return 'متجدد شهريًا';
  }
  if (!sub.ends_at) return 'متجدد شهريًا';
  return String(sub.ends_at).slice(0, 10);
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function AttendanceSummaryBlock({ summary }: { summary?: AttendanceSummary }) {
  const rate = summary?.attendance_rate ?? 0;
  const total = summary?.total_sessions ?? 0;
  const presentLike = (summary?.present ?? 0) + (summary?.late ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-latin text-[28px] font-extrabold leading-none text-navy">
            {rate}%
          </div>
          <div className="mt-1 text-[13px] font-semibold text-ink-soft">
            حضور — {presentLike} من {total} جلسة
          </div>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream-soft">
        <div
          className="h-full rounded-full bg-[#2e7d4f] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="حاضر" value={summary?.present ?? 0} color="#2e7d4f" />
        <MiniStat label="غائب" value={summary?.absent ?? 0} color="#a34b4b" />
        <MiniStat label="متأخر" value={summary?.late ?? 0} color="#c47a1a" />
        <MiniStat label="مستأذن" value={summary?.excused ?? 0} color="#6b7280" />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#f4f1ea] bg-cream-soft/50 px-3 py-2.5 text-center">
      <div className="font-latin text-[18px] font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] font-semibold text-ink-dim">{label}</div>
    </div>
  );
}

export function StudentFileDetailPage({ studentId }: { studentId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('students.manage'));
  const canViewGuardians = useAuthStore((s) => s.hasPermission('guardians.view'));
  const canViewSubscriptions = useAuthStore((s) => s.hasPermission('subscriptions.view'));
  const canManageSubscriptions = useAuthStore((s) => s.hasPermission('subscriptions.manage'));
  const canViewCoupons = useAuthStore((s) => s.hasPermission('coupons.view'));
  const canViewAttendance = useAuthStore((s) => s.hasPermission('attendance.view'));
  const canViewEvaluations = useAuthStore((s) => s.hasPermission('evaluations.view'));
  const canViewOrders = useAuthStore((s) => s.hasPermission('orders.view'));

  const [editOpen, setEditOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);

  const studentQuery = useQuery({
    queryKey: ['student', studentId],
    queryFn: () =>
      apiClient<Student>(
        `/students/${studentId}${qs({ include: 'guardian,currentGrade.educationalStage' })}`,
      ),
  });

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100, include: 'educationalStage' })}`),
  });

  const guardiansQuery = useQuery({
    queryKey: ['guardians-options'],
    queryFn: () => apiClient<Paginated<Guardian>>(`/guardians${qs({ per_page: 100 })}`),
    enabled: canViewGuardians && editOpen,
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['student-subscriptions', studentId],
    queryFn: () =>
      apiClient<Paginated<Subscription>>(
        `/students/${studentId}/subscriptions${qs({ include: 'plan,invoice', per_page: 50 })}`,
      ),
    enabled: canViewSubscriptions,
  });

  const ordersQuery = useQuery({
    queryKey: ['student-orders', studentId],
    queryFn: () =>
      apiClient<Paginated<StoreOrder>>(
        `/orders${qs({
          include: 'invoice',
          per_page: 50,
          'filter[student_id]': studentId,
        })}`,
      ),
    enabled: canViewOrders,
  });

  const attendanceSummaryQuery = useQuery({
    queryKey: ['student-attendance-summary', studentId],
    queryFn: () =>
      apiClient<{ student_id: number; summary: AttendanceSummary }>(
        `/students/${studentId}/attendance-summary`,
      ),
    enabled: canViewAttendance,
  });

  const plansQuery = useQuery({
    queryKey: ['plans-for-subscribe', studentQuery.data?.current_grade_id, showAllPlans],
    queryFn: () =>
      apiClient<Paginated<Plan>>(
        `/plans${qs({
          per_page: 100,
          include: 'durationPeriod',
          'filter[is_active]': true,
          'filter[grade_id]':
            !showAllPlans && studentQuery.data?.current_grade_id
              ? studentQuery.data.current_grade_id
              : undefined,
        })}`,
      ),
    enabled: canManageSubscriptions && subscribeOpen && Boolean(studentQuery.data),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient<Student>(`/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(buildUpdatePayload(form)),
      }),
    onSuccess: (updated) => {
      toast.success('تم تحديث ملف الطالب');
      setEditOpen(false);
      qc.setQueryData(['student', studentId], updated);
      qc.invalidateQueries({ queryKey: ['student-files'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyCouponMutation = useMutation({
    mutationFn: () =>
      apiClient<CouponValidateResult>('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode.trim(),
          plan_id: Number(planId),
        }),
      }),
    onSuccess: (result) => {
      if (result.valid && result.discount_amount != null) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discount_amount: Number(result.discount_amount),
        });
        setCouponError(null);
        setCouponCode(couponCode.trim().toUpperCase());
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message);
      }
    },
    onError: (err: Error) => {
      setAppliedCoupon(null);
      setCouponError(err.message);
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: () =>
      apiClient<{ invoice: { id: number; invoice_number: string }; subscription: Subscription }>(
        `/students/${studentId}/subscribe`,
        {
          method: 'POST',
          body: JSON.stringify({
            plan_id: Number(planId),
            ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
          }),
        },
      ),
    onSuccess: (result) => {
      toast.success(`تم إنشاء الفاتورة ${result.invoice.invoice_number}`);
      setSubscribeOpen(false);
      setPlanId('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError(null);
      qc.invalidateQueries({ queryKey: ['student-subscriptions', studentId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const student = studentQuery.data;
  const grades = gradesQuery.data?.data ?? [];
  const guardians = guardiansQuery.data?.data ?? [];
  const subscriptions = subscriptionsQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];
  const selectedPlan = plans.find((p) => String(p.id) === planId) ?? null;
  const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const totalAfterDiscount = Math.max(0, planPrice - discountAmount);

  function clearCoupon() {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError(null);
  }

  function resetSubscribeForm() {
    setPlanId('');
    setShowAllPlans(false);
    clearCoupon();
  }

  function openEdit() {
    if (!student) return;
    setForm({
      full_name: student.full_name,
      gender: student.gender ?? 'male',
      civil_id: student.civil_id ?? '',
      nationality: student.nationality ?? '',
      date_of_birth: student.date_of_birth ?? '',
      phone: student.phone ?? '',
      phone_secondary: student.phone_secondary
        ? normalizeKuwaitPhone(student.phone_secondary) || student.phone_secondary
        : '',
      address: student.address ?? '',
      previous_school: student.previous_school ?? '',
      current_grade_id: student.current_grade_id ? String(student.current_grade_id) : '',
      status: student.status ?? 'active',
      notes: student.notes ?? '',
      guardianMode: 'existing',
      guardian_id: student.guardian_id ? String(student.guardian_id) : '',
      guardian: emptyStudentForm.guardian,
    });
    setEditOpen(true);
  }

  if (studentQuery.isLoading) {
    return (
      <>
        <AdminHeader title="ملف الطالب" crumb="جاري التحميل…" />
        <AdminContent>
          <p className="text-[13px] text-ink-dim">جاري تحميل الملف…</p>
        </AdminContent>
      </>
    );
  }

  if (studentQuery.isError || !student) {
    return (
      <>
        <AdminHeader title="ملف الطالب" crumb="غير موجود" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-user-slash"
            title="الملف غير موجود"
            body="تعذر العثور على هذا الطالب."
            primary={{ label: 'العودة للقائمة', onClick: () => router.push('/dashboard/student-files') }}
          />
        </AdminContent>
      </>
    );
  }

  const guardian = student.guardian;

  return (
    <>
      <AdminHeader
        title={student.full_name}
        crumb={`ملفات الطلاب ← ${student.file_number}`}
      />

      <AdminContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Link
            href="/dashboard/student-files"
            className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
          >
            <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
            العودة للقائمة
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/proxy/students/${studentId}/pdf`}
              className="flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-bold text-navy"
            >
              <Icon name="fa-solid fa-file-pdf" className="text-[12px]" /> تصدير PDF
            </a>
            <button
              type="button"
              onClick={() => {
                let preview: Window | null = null;
                try {
                  preview = openPrintPreviewWindow();
                } catch {
                  toast.error('تعذر فتح الطباعة — اسمح بالنوافذ المنبثقة');
                  return;
                }
                void openStudentFilePrint(studentId, preview).catch(() => {
                  try {
                    preview?.close();
                  } catch {
                    /* ignore */
                  }
                  toast.error('تعذر فتح الطباعة');
                });
              }}
              className="flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-bold text-navy"
            >
              <Icon name="fa-solid fa-print" className="text-[12px]" /> طباعة
            </button>
            {canManage ? (
              <button
                type="button"
                onClick={openEdit}
                className="flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-bold text-navy"
              >
                <Icon name="fa-solid fa-pen" className="text-[11px]" /> تعديل
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[18px] bg-navy text-[28px] font-bold text-gold-soft">
              {student.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photo_path} alt="" className="h-full w-full object-cover" />
              ) : (
                (student.full_name?.trim().charAt(0)) || '؟'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[24px] font-bold text-navy-800">{student.full_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <FileNumberBadge fileNumber={student.file_number} />
                {student.status ? <StudentStatusBadge status={student.status} /> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-dim">
                <span>
                  المرحلة: <b className="text-ink-soft">{stageLabel(student)}</b>
                </span>
                <span>
                  المدرسة: <b className="text-ink-soft">{student.previous_school || '—'}</b>
                </span>
                <span className="font-latin" dir="ltr">
                  هاتف: <b className="text-ink-soft">{student.phone || '—'}</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        <SectionCard title="بيانات الطالب">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="الاسم" value={student.full_name} />
            <InfoRow label="المرحلة" value={stageLabel(student)} />
            <InfoRow label="المدرسة" value={student.previous_school ?? '—'} />
            <InfoRow label="هاتف التواصل" value={student.phone ?? '—'} />
            <InfoRow label="هاتف إضافي" value={student.phone_secondary ?? '—'} />
            <InfoRow label="الرقم المدني" value={student.civil_id ?? '—'} />
            <InfoRow label="الجنس" value={genderLabel(student.gender)} />
            <InfoRow label="تاريخ الميلاد" value={student.date_of_birth ?? '—'} />
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow label="العنوان" value={student.address ?? '—'} />
            </div>
          </div>
        </SectionCard>

        {canViewAttendance ? (
          <SectionCard title="نسبة الحضور">
            {attendanceSummaryQuery.isLoading ? (
              <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
            ) : (
              <AttendanceSummaryBlock summary={attendanceSummaryQuery.data?.summary} />
            )}
          </SectionCard>
        ) : null}

        <SectionCard title="ولي الأمر">
          {guardian ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="الاسم" value={guardian.full_name} />
                <InfoRow label="صلة القرابة" value={guardian.relationship ?? '—'} />
                <InfoRow label="الهاتف" value={guardian.phone} />
                <InfoRow label="الهاتف الثانوي" value={guardian.phone_secondary ?? '—'} />
                <InfoRow label="البريد الإلكتروني" value={guardian.email ?? '—'} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoRow label="العنوان" value={guardian.address ?? '—'} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canViewGuardians ? (
                  <Link
                    href={`/dashboard/guardians/${guardian.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#eaf0f8] bg-[#f5f8fc] px-4 py-2 text-[13px] font-semibold text-[#1c4b8f]"
                  >
                    <Icon name="fa-solid fa-file-invoice-dollar" className="text-[12px]" />
                    كشف الحساب
                  </Link>
                ) : null}
                <Link
                  href={`/dashboard/student-files?guardian_id=${guardian.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#eaf0f8] bg-[#f5f8fc] px-4 py-2 text-[13px] font-semibold text-[#1c4b8f]"
                >
                  <Icon name="fa-solid fa-users" className="text-[12px]" />
                  عرض إخوة/أخوات
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[13.5px] text-ink-dim">لا يوجد ولي أمر مرتبط.</p>
          )}
        </SectionCard>

        <SectionCard title="ملاحظات">
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
            {student.notes?.trim() || 'لا توجد ملاحظات.'}
          </p>
        </SectionCard>

        {canViewEvaluations ? (
          <SectionCard title="التقييمات">
            <StudentEvaluationsSection studentId={studentId} />
          </SectionCard>
        ) : null}

        {canViewSubscriptions ? (
          <SectionCard
            title="التسجيلات"
            action={
              canManageSubscriptions ? (
                <button
                  type="button"
                  onClick={() => {
                    resetSubscribeForm();
                    setSubscribeOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-[12.5px] font-extrabold text-navy"
                >
                  <Icon name="fa-solid fa-plus" className="text-[10px]" /> اشتراك بباقة جديدة
                </button>
              ) : null
            }
          >
            {subscriptionsQuery.isLoading ? (
              <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
            ) : subscriptions.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-tags"
                title="لا توجد تسجيلات"
                body="اشترك الطالب في باقة لإنشاء فاتورة وبدء الاشتراك."
                primary={
                  canManageSubscriptions
                    ? {
                        label: 'اشتراك بباقة جديدة',
                        onClick: () => {
                          resetSubscribeForm();
                          setSubscribeOpen(true);
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead>
                    <tr className="bg-cream-soft">
                      {[
                        'الباقة',
                        'الحالة',
                        'تاريخ البداية',
                        'تاريخ الانتهاء',
                        'رقم الفاتورة',
                        'حالة الفاتورة',
                        '',
                      ].map((c, i) => (
                        <th
                          key={`${c}-${i}`}
                          className="whitespace-nowrap px-3 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-t border-[#f4f1ea]">
                        <td className="px-3 py-2.5 text-[13px] font-bold text-ink">
                          {sub.plan?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <SubscriptionStatusCell subscription={sub} />
                        </td>
                        <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink-soft">
                          {dateLabel(sub.starts_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink-soft">
                          {durationLabel(sub)}
                        </td>
                        <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px]">
                          {sub.invoice_id ? (
                            <Link
                              href={`/dashboard/invoices/${sub.invoice_id}`}
                              className="font-bold text-navy hover:underline"
                            >
                              {sub.invoice?.invoice_number ?? `#${sub.invoice_id}`}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {sub.invoice?.status ? <StatusBadge status={sub.invoice.status} /> : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <SubscriptionFreezeActions subscription={sub} />
                            {sub.invoice_id ? (
                              <Link
                                href={`/dashboard/invoices/${sub.invoice_id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-cream-line2 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-navy"
                              >
                                <Icon name="fa-solid fa-file-invoice" className="text-[10px]" />
                                عرض الفاتورة
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        ) : null}

        {canViewOrders ? (
          <SectionCard title="طلبات المذكرات">
            {ordersQuery.isLoading ? (
              <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
            ) : orders.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-bag-shopping"
                title="لا توجد طلبات"
                body="لم يُنشأ أي طلب مذكرات لهذا الطالب بعد."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="bg-cream-soft">
                      {['رقم الفاتورة', 'الحالة', 'التاريخ'].map((c) => (
                        <th
                          key={c}
                          className="whitespace-nowrap px-3 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-[#f4f1ea]">
                        <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px]">
                          {order.invoice_id ? (
                            <Link
                              href={`/dashboard/invoices/${order.invoice_id}`}
                              className="font-bold text-navy hover:underline"
                            >
                              {order.invoice?.invoice_number ?? `#${order.invoice_id}`}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink-soft">
                          {dateLabel(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        ) : null}
      </AdminContent>

      <FormModal
        open={subscribeOpen}
        onClose={() => {
          if (!subscribeMutation.isPending) setSubscribeOpen(false);
        }}
        title="اشتراك بباقة جديدة"
        eyebrow="SUBSCRIBE"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSubscribeOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={subscribeMutation.isPending || !planId}
              onClick={() => subscribeMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {subscribeMutation.isPending ? 'جاري الإصدار…' : 'تأكيد الاشتراك وإصدار الفاتورة'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>الباقة</label>
            <select
              className={formFieldClass}
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setAppliedCoupon(null);
                setCouponError(null);
              }}
            >
              <option value="">اختر باقة…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatKwd(p.price)}
                </option>
              ))}
            </select>
            {student?.current_grade_id ? (
              <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-dim">
                <input
                  type="checkbox"
                  checked={showAllPlans}
                  onChange={(e) => {
                    setShowAllPlans(e.target.checked);
                    setPlanId('');
                    setAppliedCoupon(null);
                    setCouponError(null);
                  }}
                />
                عرض كل الباقات (خارج صف الطالب الحالي)
              </label>
            ) : null}
          </div>

          {canViewCoupons && planId ? (
            <div>
              <label className={formLabelClass}>كود الخصم</label>
              <div className="flex gap-2">
                <input
                  className={`${formFieldClass} font-latin uppercase ${
                    appliedCoupon
                      ? '!border-[#2e7d4f] focus:!border-[#2e7d4f] focus:!ring-[#2e7d4f]/40'
                      : ''
                  }`}
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    if (appliedCoupon) setAppliedCoupon(null);
                    if (couponError) setCouponError(null);
                  }}
                  placeholder="WELCOME10"
                  disabled={applyCouponMutation.isPending}
                />
                <button
                  type="button"
                  disabled={!couponCode.trim() || applyCouponMutation.isPending}
                  onClick={() => applyCouponMutation.mutate()}
                  className="shrink-0 rounded-full border border-cream-line2 bg-white px-3.5 py-2 text-[12.5px] font-bold text-navy disabled:opacity-60"
                >
                  {applyCouponMutation.isPending ? '…' : 'تطبيق'}
                </button>
              </div>
              {couponError ? (
                <p className="mt-1.5 text-[12.5px] font-semibold text-[#a34b4b]">{couponError}</p>
              ) : null}
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="mt-1.5 text-[12px] font-semibold text-ink-dim underline hover:text-navy"
                >
                  إزالة الكود
                </button>
              ) : null}
            </div>
          ) : null}

          {selectedPlan ? (
            <div className="rounded-xl border border-cream-line2 bg-cream-soft/70 px-3.5 py-3 text-[13px]">
              <div className="mb-2 text-[12px] font-bold text-navy">ملخص قبل التأكيد</div>
              <div className="space-y-1.5 text-ink-soft">
                <div>
                  الباقة: <span className="font-bold text-ink">{selectedPlan.name}</span>
                </div>
                {appliedCoupon ? (
                  <>
                    <div>
                      السعر:{' '}
                      <span className="font-latin text-ink-dim line-through">
                        {formatKwd(selectedPlan.price)}
                      </span>
                    </div>
                    <div>
                      الخصم:{' '}
                      <span className="font-latin font-bold text-[#2e7d4f]">
                        {formatKwd(discountAmount)}
                      </span>
                    </div>
                    <div>
                      السعر بعد الخصم:{' '}
                      <span className="font-latin text-[15px] font-extrabold text-navy">
                        {formatKwd(totalAfterDiscount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>
                    السعر:{' '}
                    <span className="font-latin font-bold text-ink">{formatKwd(selectedPlan.price)}</span>
                  </div>
                )}
                <div>
                  نوع المدة:{' '}
                  <span className="font-bold text-ink">
                    {selectedPlan.duration_type === 'fixed_period'
                      ? `مدة محددة — ${selectedPlan.duration_period?.name ?? '—'}`
                      : 'شهري متجدد'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </FormModal>

      <FormModal
        open={editOpen}
        wide
        onClose={() => {
          if (!updateMutation.isPending) setEditOpen(false);
        }}
        title="تعديل ملف الطالب"
        eyebrow="STUDENT"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => {
                const error = validateUpdateForm(form);
                if (error) {
                  toast.error(error);
                  return;
                }
                updateMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {updateMutation.isPending ? 'جاري الحفظ…' : 'حفظ التعديلات'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 text-[13px] font-bold text-navy">البيانات الشخصية</div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={formLabelClass}>رقم الملف</label>
                <input className={`${formFieldClass} font-latin bg-cream-soft`} value={student.file_number} readOnly />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>الاسم الكامل</label>
                <input
                  className={formFieldClass}
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>الجنس</label>
                <select
                  className={formFieldClass}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as typeof f.gender }))}
                >
                  {GENDERS.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>الحالة</label>
                <select
                  className={formFieldClass}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>الرقم المدني</label>
                <input
                  className={`${formFieldClass} font-latin`}
                  value={form.civil_id}
                  onChange={(e) => setForm((f) => ({ ...f, civil_id: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>تاريخ الميلاد</label>
                <input
                  type="date"
                  className={`${formFieldClass} font-latin`}
                  min={dobInputBounds().min}
                  max={dobInputBounds().max}
                  value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>هاتف التواصل</label>
                <input
                  className={`${formFieldClass} font-latin bg-cream-soft`}
                  dir="ltr"
                  value={form.phone}
                  readOnly
                  title="نفس هاتف ولي الأمر"
                />
                <p className="mt-1 text-[11.5px] text-ink-dim">يُؤخذ تلقائيًا من هاتف ولي الأمر</p>
              </div>
              <div>
                <label className={formLabelClass}>هاتف إضافي (اختياري)</label>
                <KuwaitPhoneInput
                  value={form.phone_secondary}
                  onChange={(phone_secondary) => setForm((f) => ({ ...f, phone_secondary }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>المرحلة / الصف *</label>
                <select
                  className={formFieldClass}
                  value={form.current_grade_id}
                  onChange={(e) => setForm((f) => ({ ...f, current_grade_id: e.target.value }))}
                >
                  <option value="">اختر المرحلة</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.educational_stage?.name
                        ? `${g.educational_stage.name} — ${g.name}`
                        : g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>المدرسة *</label>
                <SchoolSelect
                  value={form.previous_school}
                  onChange={(previous_school) => setForm((f) => ({ ...f, previous_school }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>العنوان</label>
                <input
                  className={formFieldClass}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>ملاحظات</label>
                <textarea
                  className={`${formFieldClass} min-h-[72px] resize-y`}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {canViewGuardians ? (
            <div>
              <div className="mb-3 text-[13px] font-bold text-navy">ولي الأمر</div>
              <select
                className={formFieldClass}
                value={form.guardian_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const g = guardians.find((x) => String(x.id) === id);
                  setForm((f) => ({
                    ...f,
                    guardian_id: id,
                    phone: g?.phone ? normalizeKuwaitPhone(g.phone) || g.phone : '',
                  }));
                }}
              >
                <option value="">بدون ولي أمر</option>
                {guardians.map((g) => (
                  <option key={g.id} value={g.id}>{g.full_name} — {g.phone}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </FormModal>
    </>
  );
}
