'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  FormModal,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  formatKwd,
  qs,
  type InvoiceInstallment,
  type Paginated,
  type PaymentMethod,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const PAYMENT_METHODS: { id: Exclude<PaymentMethod, 'online'>; label: string }[] = [
  { id: 'cash', label: 'نقدًا' },
  { id: 'manual_transfer', label: 'تحويل يدوي' },
];

function daysOverdue(dueDate?: string | null) {
  if (!dueDate) return 0;
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

export function OverdueInstallmentsPage() {
  const canView = useAuthStore((s) => s.hasPermission('invoices.view'));
  const canManage = useAuthStore((s) => s.hasPermission('invoices.manage'));
  const qc = useQueryClient();

  const [payTarget, setPayTarget] = useState<InvoiceInstallment | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<Exclude<PaymentMethod, 'online'>>('cash');

  const query = useQuery({
    queryKey: ['overdue-installments'],
    queryFn: () =>
      apiClient<Paginated<InvoiceInstallment>>(
        `/invoice-installments/overdue${qs({ per_page: 100 })}`,
      ),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  const markPaidMutation = useMutation({
    mutationFn: async (inst: InvoiceInstallment) =>
      apiClient<InvoiceInstallment>(
        `/invoices/${inst.invoice_id}/installments/${inst.id}/mark-paid`,
        {
          method: 'POST',
          body: JSON.stringify({ payment_method: paymentMethod }),
        },
      ),
    onSuccess: () => {
      toast.success('تم تأكيد دفع الدفعة');
      setPayTarget(null);
      qc.invalidateQueries({ queryKey: ['overdue-installments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice'] });
      qc.invalidateQueries({ queryKey: ['student-subscriptions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="الدفعات المتأخرة" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const loading = query.isLoading;
  const isEmpty = !loading && rows.length === 0;

  return (
    <>
      <AdminHeader title="الدفعات المتأخرة" crumb="الفواتير ← الدفعات المتأخرة" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              دفعات تقسيط تجاوزت تاريخ الاستحقاق ولم تُسدَّد بعد.
            </p>
          </div>

          {loading ? <TableSkeleton cols={7} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-clock-rotate-left"
              title="لا توجد دفعات متأخرة"
              body="جميع الدفعات المستحقة مسدَّدة أو لم يحن موعدها."
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الطالب',
                      'الفاتورة',
                      'الدفعة',
                      'المبلغ',
                      'تاريخ الاستحقاق',
                      'التأخير',
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
                  {rows.map((row) => {
                    const overdueDays = daysOverdue(row.due_date);
                    return (
                      <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="px-4 py-3 text-[13.5px] font-bold text-ink">
                          {row.invoice?.student?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {row.invoice ? (
                            <Link
                              href={`/dashboard/invoices/${row.invoice.id}`}
                              className="font-latin text-[13px] font-bold text-navy hover:underline"
                            >
                              {row.invoice.invoice_number}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                          #{row.sequence}
                        </td>
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy">
                          {formatKwd(row.amount)}
                        </td>
                        <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                          {row.due_date ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-bold text-[#a34b4b]">
                          {overdueDays} يوم
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            {row.invoice ? (
                              <Link
                                href={`/dashboard/invoices/${row.invoice.id}`}
                                className="flex h-[31px] items-center rounded-[9px] border border-cream-line bg-white px-2.5 text-[11.5px] font-bold text-navy"
                              >
                                الفاتورة
                              </Link>
                            ) : null}
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentMethod('cash');
                                  setPayTarget(row);
                                }}
                                className="flex h-[31px] items-center gap-1 rounded-[9px] bg-gradient-to-br from-gold-soft to-gold px-2.5 text-[11.5px] font-extrabold text-navy"
                              >
                                <Icon name="fa-solid fa-check" className="text-[10px]" />
                                تأكيد
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={Boolean(payTarget)}
        onClose={() => {
          if (!markPaidMutation.isPending) setPayTarget(null);
        }}
        title="تأكيد دفع الدفعة"
        eyebrow="INSTALLMENT"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPayTarget(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={markPaidMutation.isPending || !payTarget}
              onClick={() => payTarget && markPaidMutation.mutate(payTarget)}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {markPaidMutation.isPending ? 'جاري التأكيد…' : 'تأكيد الدفع'}
            </button>
          </>
        }
      >
        {payTarget ? (
          <>
            <p className="mb-4 text-[13.5px] text-ink-dim">
              دفعة #{payTarget.sequence} —{' '}
              <span className="font-latin font-bold text-navy">{formatKwd(payTarget.amount)}</span>
            </p>
            <label className={formLabelClass}>طريقة الدفع</label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-cream-line2 bg-white px-3.5 py-3 text-[13.5px]"
                >
                  <input
                    type="radio"
                    className="accent-gold"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </>
        ) : null}
      </FormModal>
    </>
  );
}
