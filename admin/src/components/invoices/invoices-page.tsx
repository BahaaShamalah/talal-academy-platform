'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  formatKwd,
  qs,
  type Invoice,
  type InvoiceStatus,
  type Paginated,
  type PaymentMethod,
} from '@/lib/api-client';

const STATUSES: { id: InvoiceStatus; label: string }[] = [
  { id: 'pending', label: 'معلّقة' },
  { id: 'paid', label: 'مدفوعة' },
  { id: 'cancelled', label: 'ملغية' },
  { id: 'refunded', label: 'مسترجعة' },
];

const PAYMENT_METHODS: { id: Exclude<PaymentMethod, 'online'>; label: string }[] = [
  { id: 'cash', label: 'نقدًا' },
  { id: 'manual_transfer', label: 'تحويل يدوي' },
];

function paymentLabel(method?: PaymentMethod | null) {
  if (!method) return '—';
  if (method === 'cash') return 'نقدًا';
  if (method === 'manual_transfer') return 'تحويل يدوي';
  if (method === 'online') return 'دفع إلكتروني';
  return method;
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export function InvoicesPage() {
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', status, paymentMethod],
    queryFn: () =>
      apiClient<Paginated<Invoice>>(
        `/invoices${qs({
          include: 'student,items',
          per_page: 50,
          'filter[status]': status || undefined,
          'filter[payment_method]': paymentMethod || undefined,
        })}`,
      ),
  });

  const invoices = useMemo(() => {
    const rows = invoicesQuery.data?.data ?? [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((inv) => {
      const name = inv.student?.full_name?.toLowerCase() ?? '';
      const file = inv.student?.file_number?.toLowerCase() ?? '';
      return name.includes(q) || file.includes(q);
    });
  }, [invoicesQuery.data?.data, studentSearch]);

  const loading = invoicesQuery.isLoading;
  const isEmpty = !loading && invoices.length === 0;
  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  return (
    <>
      <AdminHeader title="الفواتير" crumb="المالية ← الفواتير" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                className={`${selectCls} min-w-[180px] flex-1`}
                placeholder="بحث باسم الطالب أو رقم الملف…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">كل طرق الدفع</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[13px] text-ink-dim">{invoices.length} فاتورة</div>
          </div>

          {loading ? <TableSkeleton cols={7} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-file-invoice-dollar"
              title="لا توجد فواتير"
              body="تظهر الفواتير عند اشتراك طالب في باقة من ملفه."
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'رقم الفاتورة',
                      'الطالب',
                      'الإجمالي',
                      'الحالة',
                      'طريقة الدفع',
                      'تاريخ الإنشاء',
                      '',
                    ].map((c, i) => (
                      <th
                        key={`${c}-${i}`}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] font-bold text-navy">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">
                          {invoice.student?.full_name ?? '—'}
                        </div>
                        <div className="font-latin mt-0.5 text-[11.5px] text-ink-faint">
                          {invoice.student?.file_number ?? ''}
                        </div>
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy-800">
                        {formatKwd(invoice.total)}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.status ? <StatusBadge status={invoice.status} /> : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {paymentLabel(invoice.payment_method)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {dateLabel(invoice.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            aria-label="عرض"
                            className="flex h-[31px] w-[31px] items-center justify-center rounded-[9px] border border-cream-line bg-white text-ink-soft"
                          >
                            <Icon name="fa-solid fa-eye" className="text-[11px]" />
                          </Link>
                          <a
                            href={`/api/proxy/invoices/${invoice.id}/pdf`}
                            aria-label="تنزيل PDF"
                            className="flex h-[31px] w-[31px] items-center justify-center rounded-[9px] border border-cream-line bg-white text-ink-soft"
                          >
                            <Icon name="fa-solid fa-download" className="text-[11px]" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>
    </>
  );
}
