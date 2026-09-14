'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import InvoiceActions from '@/components/account/InvoiceActions';
import InvoiceInstallmentsPanel, {
  installmentPayKey,
} from '@/components/account/InvoiceInstallmentsPanel';
import StudentSchedule from '@/components/account/StudentSchedule';
import StudentEvaluations from '@/components/account/StudentEvaluations';
import StudentEducationalMaterials from '@/components/account/StudentEducationalMaterials';
import StudentExamResults from '@/components/account/StudentExamResults';
import StudentPrivateLessonBookings from '@/components/account/StudentPrivateLessonBookings';
import {
  type Invoice,
  type Student,
  type Subscription,
  formatKwd,
  hasActiveSubscription,
  statusLabel,
  unwrapOne,
} from '@/lib/account';
import {
  formatDateAr,
  personInitials,
  studentGradeLabel,
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

function genderLabel(gender?: string | null) {
  if (gender === 'male') return 'ذكر';
  if (gender === 'female') return 'أنثى';
  return '';
}

function ChildFileInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;
  const { setSelectedStudentId } = usePortal();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [paidInvoice, setPaidInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);

  const paidFlash = search.get('paid') === '1';
  const installmentFlash = search.get('installment') === '1';
  const paidInvoiceId = search.get('invoice_id');

  useEffect(() => {
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) setSelectedStudentId(n);
  }, [id, setSelectedStudentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, attRes] = await Promise.all([
        fetch(`/api/guardian/students/${id}`, { cache: 'no-store' }),
        fetch(`/api/guardian/students/${id}/attendance-summary`, { cache: 'no-store' }),
      ]);
      const sJson = await sRes.json();
      if (!sRes.ok) {
        setError(sJson.message || 'تعذّر تحميل بيانات الطالب');
        return;
      }
      setStudent(unwrapOne<Student>(sJson));
      if (attRes.ok) {
        const att = await attRes.json();
        setAttendance(att.summary ?? null);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!paidFlash || !installmentFlash || !paidInvoiceId) return;
    void (async () => {
      const res = await fetch(`/api/guardian/invoices/${paidInvoiceId}`);
      if (res.ok) setPaidInvoice(unwrapOne<Invoice>(await res.json()));
    })();
  }, [paidFlash, installmentFlash, paidInvoiceId]);

  async function payInvoice(invoiceId: number) {
    setPayingInvoiceId(invoiceId);
    setPayingKey(String(invoiceId));
    try {
      sessionStorage.setItem('pay_return_student_id', String(id));
      sessionStorage.removeItem('pay_return_installment');
      sessionStorage.removeItem('pay_return_invoice_id');
      const res = await fetch(`/api/guardian/invoices/${invoiceId}/pay`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.payment_url) {
        window.location.href = json.payment_url;
        return;
      }
      alert(json.message || 'تعذّر بدء الدفع الإلكتروني.');
    } catch {
      alert('حدث خطأ في الاتصال');
    } finally {
      setPayingKey(null);
      setPayingInvoiceId(null);
    }
  }

  async function payInstallment(invoiceId: number, installmentId: number) {
    const key = installmentPayKey(invoiceId, installmentId);
    setPayingKey(key);
    try {
      sessionStorage.setItem('pay_return_student_id', String(id));
      sessionStorage.setItem('pay_return_installment', '1');
      sessionStorage.setItem('pay_return_invoice_id', String(invoiceId));
      const res = await fetch(
        `/api/guardian/invoices/${invoiceId}/installments/${installmentId}/pay`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (res.ok && json.payment_url) {
        window.location.href = json.payment_url;
        return;
      }
      alert(json.message || 'تعذّر بدء الدفع الإلكتروني.');
    } catch {
      alert('حدث خطأ في الاتصال');
    } finally {
      setPayingKey(null);
    }
  }

  if (loading) {
    return (
      <PortalPage title="ملف الطالب" crumb="جاري التحميل…" showSwitcher={false}>
        <p className="text-[13px] text-ink-dim">جاري تحميل بيانات الطالب…</p>
      </PortalPage>
    );
  }

  if (error || !student) {
    return (
      <PortalPage title="ملف الطالب" crumb="تعذّر التحميل" showSwitcher={false}>
        <p className="text-[14px] text-[#a34b4b]">{error || 'غير موجود'}</p>
        <Link href="/portal/children" className="text-[13px] font-bold text-gold-deep">
          ← العودة إلى أبنائي
        </Link>
      </PortalPage>
    );
  }

  const subs: Subscription[] = student.plan_subscriptions ?? [];
  const invoices: Invoice[] = student.invoices ?? [];
  const active = hasActiveSubscription(student);
  const remainingInstallments = paidInvoice?.installments?.filter((i) => i.status === 'pending') ?? [];
  const attTotal = attendance?.total_sessions ?? 0;

  return (
    <PortalPage title={student.full_name} crumb={studentGradeLabel(student)} showSwitcher={false}>
      <Link href="/portal/children" className="text-[13px] font-semibold text-gold-deep">
        ← أبنائي
      </Link>

      <div className="rounded-[20px] border border-gold/40 bg-[radial-gradient(120%_120%_at_85%_10%,#1c2f63,#0b234a_62%)] p-[22px] text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-[18px] font-bold text-navy">
              {personInitials(student.full_name)}
            </span>
            <div>
              <div className="font-display text-[22px] font-bold">{student.full_name}</div>
              <div className="mt-1.5 text-[13px] text-muted">{studentGradeLabel(student)}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-dim">
                {student.file_number ? <span>رقم الملف {student.file_number}</span> : null}
                {genderLabel(student.gender) ? <span>{genderLabel(student.gender)}</span> : null}
                {student.date_of_birth ? <span>الميلاد {formatDateAr(student.date_of_birth)}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold',
                active ? 'bg-[#7fd6a3]/[.16] text-[#7fd6a3]' : 'bg-white/[.08] text-[#f0e6cf]',
              )}
            >
              <Icon name={active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'} />
              {active ? 'اشتراك نشط' : 'لا يوجد اشتراك نشط'}
            </span>
            <Link
              href={`/account/children/${id}/subscribe`}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {active ? 'باقة جديدة' : 'اشتراك بباقة'}
            </Link>
          </div>
        </div>
      </div>

      {paidFlash && installmentFlash && paidInvoice ? (
        <div className="rounded-[16px] border border-[#9fd4b0] bg-[#e9f3ec] px-4 py-3.5 text-[13px] text-[#2e7d4f]">
          <p className="font-bold">تم سداد الدفعة الأولى بنجاح — اشتراكك نشط. باقي الدفعات حسب الجدول أدناه.</p>
          {remainingInstallments.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[12.5px] text-navy-800">
              {remainingInstallments.map((inst) => (
                <li key={inst.id} className="font-latin" dir="ltr">
                  دفعة #{inst.sequence}: {formatKwd(inst.amount)} — استحقاق {inst.due_date}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : paidFlash ? (
        <div className="rounded-[16px] border border-[#9fd4b0] bg-[#e9f3ec] px-4 py-3.5 text-[13px] text-[#2e7d4f]">
          تم استلام نتيجة الدفع — حدّث الحالة بعد تأكيد الإدارة إن لزم.
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        {[
          {
            icon: 'fa-solid fa-calendar-check',
            value: attTotal ? `${Math.round(attendance?.attendance_rate ?? 0)}%` : '—',
            label: 'نسبة الحضور',
          },
          {
            icon: 'fa-solid fa-user-check',
            value: attTotal ? String(attendance?.present ?? 0) : '—',
            label: 'حاضر',
          },
          {
            icon: 'fa-solid fa-user-xmark',
            value: attTotal ? String(attendance?.absent ?? 0) : '—',
            label: 'غائب',
          },
          {
            icon: 'fa-solid fa-clock',
            value: attTotal ? String(attendance?.late ?? 0) : '—',
            label: 'متأخر',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-[18px] border border-cream-line bg-white p-4">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
              <Icon name={s.icon} />
            </span>
            <div className="mt-3 text-[24px] font-bold leading-none text-navy-800">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] text-ink-soft">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2.5">
        {[
          { href: '/portal/schedule', icon: 'fa-solid fa-calendar-week', label: 'الجدول' },
          { href: '/portal/homework', icon: 'fa-solid fa-book-open', label: 'المواد' },
          { href: '/portal/reports', icon: 'fa-solid fa-chart-line', label: 'التقارير' },
          { href: '/portal/subscription', icon: 'fa-solid fa-wallet', label: 'الاشتراك' },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-[15px] border border-[#f0ece1] bg-white px-2.5 py-4 text-center"
          >
            <span className="mx-auto flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
              <Icon name={q.icon} />
            </span>
            <div className="mt-2.5 text-[12px] font-bold text-ink">{q.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
        <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">الاشتراكات</h2>
        {subs.length === 0 ? (
          <div className="text-center">
            <p className="text-[13px] text-ink-dim">لا يوجد اشتراك نشط</p>
            <Link
              href={`/account/children/${id}/subscribe`}
              className="mt-3 inline-flex rounded-full bg-navy-800 px-5 py-2.5 text-[13px] font-bold text-gold-soft"
            >
              اشتراك بباقة
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3 text-[13px]"
              >
                <div>
                  <div className="font-bold text-ink">{s.plan?.name ?? `باقة #${s.plan_id}`}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-dim">
                    {formatDateAr(s.starts_at)} — {formatDateAr(s.ends_at)}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold',
                    s.status === 'active' ? 'bg-[#e9f3ec] text-[#2e7d4f]' : 'bg-[#f7f0e1] text-gold-deep',
                  )}
                >
                  {statusLabel(s.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudentSchedule studentId={id} />
      <StudentEvaluations studentId={id} />
      <StudentEducationalMaterials studentId={id} />
      <StudentExamResults studentId={id} />

      <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[16.5px] font-bold text-navy-800">حجوزات الحصص الخاصة</h2>
          <Link
            href="/portal/private-lessons/book"
            className="rounded-full border border-cream-line2 bg-white px-3.5 py-1.5 text-[12px] font-bold text-navy-800"
          >
            + حجز جديد
          </Link>
        </div>
        <StudentPrivateLessonBookings
          studentId={id}
          payingId={payingInvoiceId}
          onPay={(invoiceId) => void payInvoice(invoiceId)}
        />
      </div>

      <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
        <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">الفواتير</h2>
        {invoices.length === 0 ? (
          <p className="text-[13px] text-ink-dim">لا توجد فواتير لهذا الطالب.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-latin font-bold text-navy-800" dir="ltr">
                      {inv.invoice_number}
                    </p>
                    <p className="mt-0.5 text-ink-dim">
                      {statusLabel(inv.status)}
                      {!inv.has_installments ? ` · ${formatKwd(inv.total)}` : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <InvoiceActions invoiceId={inv.id} />
                    {!inv.has_installments && (inv.status === 'pending' || inv.can_pay_online) ? (
                      <button
                        type="button"
                        disabled={payingKey === String(inv.id)}
                        onClick={() => void payInvoice(inv.id)}
                        className="rounded-full bg-navy-800 px-3.5 py-1.5 text-[12px] font-bold text-gold"
                      >
                        {payingKey === String(inv.id) ? '…' : 'دفع'}
                      </button>
                    ) : null}
                  </div>
                </div>
                {inv.has_installments ? (
                  <InvoiceInstallmentsPanel
                    invoice={inv}
                    payingKey={payingKey}
                    onPayInstallment={(invoiceId, installmentId) =>
                      void payInstallment(invoiceId, installmentId)
                    }
                    compact
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalPage>
  );
}

export default function PortalChildFilePage() {
  return (
    <Suspense
      fallback={
        <PortalPage title="ملف الطالب" crumb="جاري التحميل…" showSwitcher={false}>
          <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
        </PortalPage>
      }
    >
      <ChildFileInner />
    </Suspense>
  );
}
