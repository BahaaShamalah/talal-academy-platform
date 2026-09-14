'use client';

import { useCallback, useEffect, useState } from 'react';
import InvoiceInstallmentsPanel, {
  installmentPayKey,
} from '@/components/account/InvoiceInstallmentsPanel';
import InvoiceActions from '@/components/account/InvoiceActions';
import {
  type Invoice,
  type Student,
  statusLabel,
  unwrapList,
} from '@/lib/account';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [status, setStatus] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('filter[status]', status);
    if (studentId) params.set('filter[student_id]', studentId);
    const res = await fetch(`/api/guardian/invoices?${params.toString()}`);
    if (res.ok) setInvoices(unwrapList<Invoice>(await res.json()));
    setLoading(false);
  }, [status, studentId]);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/guardian/students?per_page=50');
      if (res.ok) setStudents(unwrapList<Student>(await res.json()));
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function payInvoice(invoice: Invoice) {
    setPayingKey(String(invoice.id));
    try {
      if (invoice.student_id) {
        sessionStorage.setItem('pay_return_student_id', String(invoice.student_id));
      }
      sessionStorage.removeItem('pay_return_installment');
      sessionStorage.removeItem('pay_return_invoice_id');
      const res = await fetch(`/api/guardian/invoices/${invoice.id}/pay`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.payment_url) {
        window.location.href = json.payment_url;
        return;
      }
      alert(json.message || 'تعذّر بدء الدفع');
    } finally {
      setPayingKey(null);
    }
  }

  async function payInstallment(invoiceId: number, installmentId: number, studentIdForReturn: number) {
    setPayingKey(installmentPayKey(invoiceId, installmentId));
    try {
      sessionStorage.setItem('pay_return_student_id', String(studentIdForReturn));
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
      alert(json.message || 'تعذّر بدء الدفع');
    } finally {
      setPayingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-extrabold">الفواتير</h2>
        <p className="text-[13px] text-[#8a8478]">كل فواتير الأبناء في مكان واحد</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-[#ece6d8] bg-white px-3 py-2 text-[13px]"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">كل الأبناء</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-[#ece6d8] bg-white px-3 py-2 text-[13px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="pending">معلّقة</option>
          <option value="paid">مدفوعة</option>
        </select>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>
      ) : invoices.length === 0 ? (
        <p className="text-[14px] text-[#8a8478]">لا توجد فواتير.</p>
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="rounded-2xl border border-[#ece6d8] bg-white px-4 py-3 text-[13px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">{inv.student?.full_name ?? `طالب #${inv.student_id}`}</p>
                  <p className="font-latin text-[#8a8478]" dir="ltr">
                    {inv.invoice_number} · {statusLabel(inv.status)}
                    {!inv.has_installments ? ` · ${inv.total} د.ك` : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <InvoiceActions invoiceId={inv.id} />
                  {!inv.has_installments && (inv.status === 'pending' || inv.can_pay_online) ? (
                  <button
                    type="button"
                    disabled={payingKey === String(inv.id)}
                    onClick={() => void payInvoice(inv)}
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
                    void payInstallment(invoiceId, installmentId, inv.student_id)
                  }
                  compact
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
