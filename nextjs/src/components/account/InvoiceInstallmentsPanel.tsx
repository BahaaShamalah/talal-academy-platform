'use client';

import {
  type Invoice,
  type InvoiceInstallment,
  formatKwd,
  installmentStatusLabel,
} from '@/lib/account';

type Props = {
  invoice: Invoice;
  payingKey: string | null;
  onPayInstallment: (invoiceId: number, installmentId: number) => void;
  compact?: boolean;
};

function payKey(invoiceId: number, installmentId: number) {
  return `${invoiceId}-${installmentId}`;
}

export default function InvoiceInstallmentsPanel({
  invoice,
  payingKey,
  onPayInstallment,
  compact = false,
}: Props) {
  const installments = [...(invoice.installments ?? [])].sort((a, b) => a.sequence - b.sequence);
  if (installments.length === 0) return null;

  const paidTotal = installments
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + Number(i.amount), 0);
  const total = Number(invoice.total);

  return (
    <div className={compact ? 'mt-2 space-y-2' : 'space-y-3'}>
      {!compact ? (
        <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl bg-[#f8f5ee] px-3 py-2.5 text-[13px]">
          <div>
            <p className="text-[#8a8478]">إجمالي الفاتورة</p>
            <p className="font-latin text-[16px] font-extrabold text-navy-800" dir="ltr">
              {formatKwd(invoice.total)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[#8a8478]">المسدَّد</p>
            <p className="font-latin text-[14px] font-bold text-[#2e7d4f]" dir="ltr">
              {formatKwd(paidTotal)}
              {total > 0 ? ` (${Math.round((paidTotal / total) * 100)}%)` : ''}
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#ece6d8]">
        <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[#f8f5ee] text-[#8a8478]">
              {['الدفعة', 'المبلغ', 'الاستحقاق', 'الحالة', ''].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-right font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => (
              <InstallmentRow
                key={inst.id}
                inst={inst}
                invoiceId={invoice.id}
                paying={payingKey === payKey(invoice.id, inst.id)}
                onPay={() => onPayInstallment(invoice.id, inst.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstallmentRow({
  inst,
  invoiceId,
  paying,
  onPay,
}: {
  inst: InvoiceInstallment;
  invoiceId: number;
  paying: boolean;
  onPay: () => void;
}) {
  const overdue = inst.status === 'pending' && inst.is_overdue;
  const rowClass = overdue
    ? 'border-t border-[#f5e6c8] bg-[#fff9ef]'
    : 'border-t border-[#f4f1ea]';

  const statusClass =
    inst.status === 'paid'
      ? 'text-[#2e7d4f]'
      : overdue
        ? 'text-[#b07a1a]'
        : 'text-[#8a8478]';

  return (
    <tr className={rowClass}>
      <td className="font-latin px-3 py-2.5 font-bold" dir="ltr">
        #{inst.sequence}
      </td>
      <td className="font-latin whitespace-nowrap px-3 py-2.5 font-bold text-navy-800" dir="ltr">
        {formatKwd(inst.amount)}
      </td>
      <td className="font-latin px-3 py-2.5 text-[#8a8478]" dir="ltr">
        {inst.due_date ?? '—'}
      </td>
      <td className={`px-3 py-2.5 font-bold ${statusClass}`}>
        {installmentStatusLabel(inst.status ?? 'pending', inst.is_overdue)}
      </td>
      <td className="px-3 py-2.5">
        {inst.status === 'pending' ? (
          <button
            type="button"
            disabled={paying}
            onClick={onPay}
            className="whitespace-nowrap rounded-full bg-navy-800 px-3 py-1 text-[11.5px] font-bold text-gold disabled:opacity-50"
          >
            {paying ? '…' : 'ادفع الآن'}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export { payKey as installmentPayKey };
