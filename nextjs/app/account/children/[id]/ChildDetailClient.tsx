'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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

type AttendanceSummary = {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
};

export default function ChildDetailClient() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, attRes] = await Promise.all([
        fetch(`/api/guardian/students/${id}`),
        fetch(`/api/guardian/students/${id}/attendance-summary`),
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

  if (loading) return <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>;
  if (error || !student) return <p className="text-[14px] text-[#a34b4b]">{error || 'غير موجود'}</p>;

  const subs: Subscription[] = student.plan_subscriptions ?? [];
  const invoices: Invoice[] = student.invoices ?? [];
  const active = hasActiveSubscription(student);

  const remainingInstallments =
    paidInvoice?.installments?.filter((i) => i.status === 'pending') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account" className="text-[13px] text-[#8a8478]">
          ← أبنائي
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-extrabold">{student.full_name}</h2>
            <p className="text-[13px] text-[#8a8478]">
              {student.current_grade?.name ?? 'بدون صف'}
              {student.file_number ? ` · رقم الملف ${student.file_number}` : ''}
            </p>
          </div>
          {!active ? (
            <Link
              href={`/account/children/${id}/subscribe`}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[14px] font-extrabold text-navy"
            >
              اشتراك بباقة
            </Link>
          ) : null}
        </div>
      </div>

      {paidFlash && installmentFlash && paidInvoice ? (
        <div className="space-y-3 rounded-xl border border-[#9fd4b0] bg-[#e7f5ec] px-4 py-3 text-[13px] text-[#2e7d4f]">
          <p className="font-bold">
            تم سداد الدفعة الأولى بنجاح — اشتراكك نشط. باقي الدفعات حسب الجدول أدناه.
          </p>
          {remainingInstallments.length > 0 ? (
            <ul className="space-y-1 text-[12.5px] text-[#1c1a17]">
              {remainingInstallments.map((inst) => (
                <li key={inst.id} className="font-latin" dir="ltr">
                  دفعة #{inst.sequence}: {formatKwd(inst.amount)} — استحقاق {inst.due_date}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : paidFlash ? (
        <div className="rounded-xl border border-[#9fd4b0] bg-[#e7f5ec] px-4 py-3 text-[13px] text-[#2e7d4f]">
          تم استلام نتيجة الدفع — حدّث الحالة بعد تأكيد الإدارة إن لزم.
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
        <h3 className="mb-3 text-[15px] font-extrabold">الاشتراكات</h3>
        {subs.length === 0 ? (
          <div className="text-center">
            <p className="text-[13px] text-[#8a8478]">لا يوجد اشتراك نشط</p>
            <Link
              href={`/account/children/${id}/subscribe`}
              className="mt-3 inline-flex rounded-full bg-navy-800 px-5 py-2.5 text-[13px] font-bold text-gold"
            >
              اشتراك بباقة
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8f5ee] px-3 py-2.5 text-[13px]"
              >
                <span className="font-bold">{s.plan?.name ?? `باقة #${s.plan_id}`}</span>
                <span className="text-[#8a8478]">{statusLabel(s.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StudentSchedule studentId={id} />

      <StudentEvaluations studentId={id} />
      <StudentEducationalMaterials studentId={id} />
      <StudentExamResults studentId={id} />

      <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">حجوزات الحصص الخاصة</h3>
          <Link
            href="/portal/private-lessons/book"
            className="rounded-full border border-[#e5dfd0] bg-white px-3.5 py-1.5 text-[12px] font-bold text-navy-800"
          >
            + حجز جديد
          </Link>
        </div>
        <StudentPrivateLessonBookings
          studentId={id}
          payingId={payingInvoiceId}
          onPay={(invoiceId) => void payInvoice(invoiceId)}
        />
      </section>

      <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
        <h3 className="mb-3 text-[15px] font-extrabold">نسبة الحضور</h3>
        {!attendance || attendance.total_sessions === 0 ? (
          <p className="text-[13px] text-[#8a8478]">لا توجد بيانات حضور بعد.</p>
        ) : (
          <div className="flex flex-wrap gap-4 text-[13px]">
            <div>
              <p className="text-[28px] font-extrabold text-navy-800">{attendance.attendance_rate}%</p>
              <p className="text-[#8a8478]">نسبة الحضور</p>
            </div>
            <div className="text-[#8a8478]">
              حاضر {attendance.present} · غائب {attendance.absent} · متأخر {attendance.late} · من أصل{' '}
              {attendance.total_sessions}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
        <h3 className="mb-3 text-[15px] font-extrabold">الفواتير</h3>
        {invoices.length === 0 ? (
          <p className="text-[13px] text-[#8a8478]">لا توجد فواتير لهذا الطالب.</p>
        ) : (
          <ul className="space-y-4">
            {invoices.map((inv) => (
              <li key={inv.id} className="rounded-xl bg-[#f8f5ee] px-3 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold font-latin" dir="ltr">
                      {inv.invoice_number}
                    </p>
                    <p className="text-[#8a8478]">
                      {statusLabel(inv.status)}
                      {!inv.has_installments ? ` · ${inv.total} د.ك` : null}
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
