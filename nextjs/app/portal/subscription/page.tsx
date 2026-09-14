'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import InvoiceActions from '@/components/account/InvoiceActions';
import InvoiceInstallmentsPanel, {
  installmentPayKey,
} from '@/components/account/InvoiceInstallmentsPanel';
import {
  type Invoice,
  formatKwd,
  statusLabel,
  unwrapList,
} from '@/lib/account';
import {
  durationTypeLabel,
  formatDateAr,
  paymentMethodLabel,
  primarySubscription,
  subjectIcon,
  subscriptionProgress,
  subscriptionSubjects,
} from '@/lib/portal';
import { cn } from '@/lib/cn';

export default function PortalSubscriptionPage() {
  const { selectedStudent } = usePortal();
  const studentId = selectedStudent?.id;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  const sub = primarySubscription(selectedStudent);
  const subjects = subscriptionSubjects(selectedStudent);
  const progress = subscriptionProgress(sub);
  const active = sub?.status === 'active';
  const price = sub?.plan?.price ?? sub?.invoice?.total;

  const loadInvoices = useCallback(async () => {
    if (!studentId) {
      setInvoices([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ 'filter[student_id]': String(studentId), per_page: '50' });
      const res = await fetch(`/api/guardian/invoices?${params}`, { cache: 'no-store' });
      if (res.ok) setInvoices(unwrapList<Invoice>(await res.json()));
      else setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  async function payInvoice(invoice: Invoice) {
    setPayingKey(String(invoice.id));
    try {
      sessionStorage.setItem('pay_return_student_id', String(invoice.student_id));
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

  const subscribeHref = studentId ? `/account/children/${studentId}/subscribe` : '/register';

  return (
    <PortalPage title="الاشتراك" crumb="تفاصيل الباقة والفواتير">
      <div className="rounded-[20px] border border-gold/40 bg-[radial-gradient(120%_120%_at_85%_10%,#1c2f63,#0b234a_62%)] p-[22px] text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold',
                active ? 'bg-[#7fd6a3]/[.16] text-[#7fd6a3]' : 'bg-white/[.08] text-[#f0e6cf]',
              )}
            >
              <Icon name={active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'} />
              {sub ? statusLabel(sub.status) : 'لا يوجد اشتراك'}
            </span>
            <div className="font-display mt-3.5 text-[23px] font-bold">
              {sub?.plan?.name ?? 'لم يُسجَّل اشتراك بعد'}
            </div>
            <div className="mt-1.5 text-[13px] text-muted">
              {subjects.map((s) => s.name).join(' · ') ||
                sub?.plan?.product_type?.name_ar ||
                'اختر باقة للتسجيل'}
            </div>
          </div>
          <div className="text-left">
            <div className="font-latin text-[42px] font-bold leading-[.9] text-gold-soft">
              {price != null && price !== '' ? Number(price).toFixed(3) : '—'}
            </div>
            <div className="mt-1.5 text-[12.5px] text-muted">
              د.ك{durationTypeLabel(sub?.plan?.duration_type) ? ` / ${durationTypeLabel(sub?.plan?.duration_type)}` : ''}
            </div>
          </div>
        </div>

        {sub ? (
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-[18px] border-t border-white/[.12] pt-[18px]">
            <div>
              <div className="text-[11.5px] text-muted-dim">تاريخ البداية</div>
              <div className="mt-1 text-[14px] font-bold">{formatDateAr(sub.starts_at)}</div>
            </div>
            <div>
              <div className="text-[11.5px] text-muted-dim">تاريخ الانتهاء</div>
              <div className="mt-1 text-[14px] font-bold">{formatDateAr(sub.ends_at)}</div>
            </div>
            {sub.plan?.duration_period?.name ? (
              <div>
                <div className="text-[11.5px] text-muted-dim">الفصل</div>
                <div className="mt-1 text-[14px] font-bold">{sub.plan.duration_period.name}</div>
              </div>
            ) : null}
            {sub.invoice?.invoice_number ? (
              <div>
                <div className="text-[11.5px] text-muted-dim">الفاتورة</div>
                <div className="mt-1 font-latin text-[14px] font-bold">{sub.invoice.invoice_number}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {progress ? (
          <div className="mt-[18px]">
            <div className="flex items-center justify-between text-[12px] text-muted">
              <span>المتبقي من مدة الاشتراك</span>
              <b className="font-latin text-gold-soft">{progress.daysLeft} يومًا</b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.12]">
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold-soft to-gold"
                style={{ width: `${progress.pctLeft}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href={subscribeHref}
            className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-[26px] py-3.5 text-[14.5px] font-extrabold text-navy"
          >
            {sub ? 'تجديد / باقة جديدة' : 'الاشتراك الآن'}
          </Link>
          {studentId ? (
            <Link
              href={`/portal/children/${studentId}`}
              className="rounded-full border border-gold/50 bg-white/[.06] px-[26px] py-3.5 text-[14.5px] font-bold text-[#f0e6cf]"
            >
              ملف الطالب
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">المواد المشترَك بها</h2>
          {subjects.length === 0 ? (
            <p className="text-[13px] text-ink-dim">لا مواد مسجّلة بعد.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {subjects.map((sb) => (
                <div
                  key={sb.name}
                  className="flex items-center gap-3 rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3"
                >
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gold/[.14] text-gold-deep">
                    <Icon name={subjectIcon(sb.name)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{sb.name}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-dim">{sb.teacher || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-cream-line bg-white p-[18px]">
          <h2 className="font-display mb-3.5 text-[16.5px] font-bold text-navy-800">سجلّ الفواتير</h2>
          {loading ? (
            <p className="text-[13px] text-ink-dim">جاري تحميل الفواتير…</p>
          ) : invoices.length === 0 ? (
            <p className="text-[13px] text-ink-dim">لا توجد فواتير.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {invoices.map((inv) => (
                <div key={inv.id} className="rounded-[14px] border border-[#f0ece1] bg-cream-soft px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-latin text-[12.5px] font-bold text-navy-800">{inv.invoice_number}</div>
                      <div className="mt-1 text-[11.5px] text-ink-dim">
                        {formatDateAr(inv.paid_at || inv.created_at)} · {paymentMethodLabel(inv.payment_method)}
                      </div>
                    </div>
                    <span className="font-latin whitespace-nowrap text-[14px] font-bold text-ink">
                      {formatKwd(inv.total)}
                    </span>
                    <span
                      className={cn(
                        'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold',
                        inv.status === 'paid'
                          ? 'bg-[#e9f3ec] text-[#2e7d4f]'
                          : 'bg-[#f7f0e1] text-gold-deep',
                      )}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalPage>
  );
}
