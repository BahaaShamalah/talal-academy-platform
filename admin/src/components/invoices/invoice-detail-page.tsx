'use client';



import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { AdminContent } from '@/components/layout/admin-content';

import { AdminHeader } from '@/components/layout/admin-header';

import { EmptyState } from '@/components/ui/empty-state';

import {

  FormModal,

  formLabelClass,

} from '@/components/ui/form-modal';

import { Icon } from '@/components/ui/icon';

import { StatusBadge } from '@/components/ui/status-badge';

import {

  apiClient,

  formatKwd,

  type Invoice,

  type InvoiceInstallment,

  type PaymentMethod,

} from '@/lib/api-client';

import { useAuthStore } from '@/stores/auth-store';

function canManageInvoicePayments(permissions: string[]): boolean {
  return permissions.includes('invoices.manage') || permissions.includes('subscriptions.manage');
}



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

  return String(value).slice(0, 16).replace('T', ' ');

}



function installmentBadgeStatus(inst: InvoiceInstallment) {

  if (inst.status === 'paid') return 'paid';

  if (inst.is_overdue) return 'overdue';

  return 'pending';

}



function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {

  return (

    <div className="rounded-xl border border-[#f4f1ea] bg-cream-soft/40 px-3.5 py-3">

      <div className="text-[11.5px] font-semibold text-ink-dim">{label}</div>

      <div className="mt-1 text-[13.5px] font-medium text-ink">{value || '—'}</div>

    </div>

  );

}



export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {

  const router = useRouter();

  const qc = useQueryClient();

  const canManage = useAuthStore((s) => canManageInvoicePayments(s.user?.permissions ?? []));

  const [payOpen, setPayOpen] = useState(false);

  const [payInstallmentTarget, setPayInstallmentTarget] = useState<InvoiceInstallment | null>(

    null,

  );

  const [paymentMethod, setPaymentMethod] =

    useState<Exclude<PaymentMethod, 'online'>>('cash');



  const invoiceQuery = useQuery({

    queryKey: ['invoice', invoiceId],

    queryFn: () => apiClient<Invoice>(`/invoices/${invoiceId}`),

  });



  const markPaidMutation = useMutation({

    mutationFn: () =>

      apiClient<Invoice>(`/invoices/${invoiceId}/mark-paid`, {

        method: 'POST',

        body: JSON.stringify({ payment_method: paymentMethod }),

      }),

    onSuccess: () => {
      toast.success('تم تأكيد الدفع بنجاح');
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['student-subscriptions'] });
    },

    onError: (err: Error) => toast.error(err.message),

  });



  const markInstallmentMutation = useMutation({

    mutationFn: (inst: InvoiceInstallment) =>

      apiClient<InvoiceInstallment>(

        `/invoices/${invoiceId}/installments/${inst.id}/mark-paid`,

        {

          method: 'POST',

          body: JSON.stringify({ payment_method: paymentMethod }),

        },

      ),

    onSuccess: () => {

      toast.success('تم تأكيد دفع الدفعة');

      setPayInstallmentTarget(null);

      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] });

      qc.invalidateQueries({ queryKey: ['invoices'] });

      qc.invalidateQueries({ queryKey: ['overdue-installments'] });

      qc.invalidateQueries({ queryKey: ['student-subscriptions'] });

    },

    onError: (err: Error) => toast.error(err.message),

  });



  const invoice = invoiceQuery.data;

  const showDiscount =
    Number(invoice?.coupon_discount_amount ?? 0) > 0 ||
    Number(invoice?.family_discount_amount ?? 0) > 0;

  const installments = invoice?.installments ?? [];
  const hasInstallments = installments.length > 0;
  const isPending = invoice?.status === 'pending';
  const showFullPayButton = canManage && isPending && !hasInstallments;



  const paidInstallmentTotal = useMemo(() => {

    return installments

      .filter((i) => i.status === 'paid')

      .reduce((acc, i) => acc + Number(i.amount), 0);

  }, [installments]);



  const paidPercent = useMemo(() => {

    const total = Number(invoice?.total ?? 0);

    if (total <= 0) return 0;

    return Math.min(100, Math.round((paidInstallmentTotal / total) * 100));

  }, [paidInstallmentTotal, invoice?.total]);



  if (invoiceQuery.isLoading) {

    return (

      <>

        <AdminHeader title="تفاصيل الفاتورة" crumb="جاري التحميل…" />

        <AdminContent className="text-[13px] text-ink-dim">جاري تحميل الفاتورة…</AdminContent>

      </>

    );

  }



  if (invoiceQuery.isError || !invoice) {

    return (

      <>

        <AdminHeader title="تفاصيل الفاتورة" crumb="غير موجودة" />

        <AdminContent>

          <EmptyState

            icon="fa-solid fa-file-circle-xmark"

            title="الفاتورة غير موجودة"

            body="تعذر العثور على هذه الفاتورة."

            primary={{ label: 'العودة للقائمة', onClick: () => router.push('/dashboard/invoices') }}

          />

        </AdminContent>

      </>

    );

  }



  return (

    <>

      <AdminHeader

        title={invoice.invoice_number}

        crumb={`الفواتير ← ${invoice.invoice_number}`}

      />



      <AdminContent className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <Link

            href="/dashboard/invoices"

            className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"

          >

            <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />

            العودة للقائمة

          </Link>

          <div className="flex flex-wrap items-center gap-2">

            <a

              href={`/api/proxy/invoices/${invoice.id}/pdf`}

              className="flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-bold text-navy"

            >

              <Icon name="fa-solid fa-download" className="text-[12px]" /> تنزيل PDF

            </a>

            <a

              href={`/api/proxy/invoices/${invoice.id}/pdf?preview=1`}

              target="_blank"

              rel="noreferrer"

              className="flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-bold text-navy"

            >

              <Icon name="fa-solid fa-print" className="text-[12px]" /> طباعة

            </a>

            {showFullPayButton ? (

              <button

                type="button"

                onClick={() => {

                  setPaymentMethod('cash');

                  setPayOpen(true);

                }}

                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy"

              >

                <Icon name="fa-solid fa-check" className="text-[12px]" /> تأكيد الدفع

              </button>

            ) : null}

          </div>

        </div>



        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-5">

          <div className="mb-4 flex flex-wrap items-center gap-3">

            <span className="font-latin text-[20px] font-bold text-navy">{invoice.invoice_number}</span>

            {invoice.status ? <StatusBadge status={invoice.status} /> : null}

            {hasInstallments ? (

              <span className="rounded-full bg-[#eaf0f8] px-2.5 py-1 text-[11.5px] font-bold text-[#1c4b8f]">

                تقسيط — {paidPercent}% مسدَّد

              </span>

            ) : null}

          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#f4f1ea] bg-cream-soft/40 px-4 py-3">

            <div>

              <div className="text-[11.5px] font-semibold text-ink-dim">إجمالي الفاتورة</div>

              <div className="font-latin text-[22px] font-bold text-navy">{formatKwd(invoice.total)}</div>

            </div>

            {hasInstallments ? (

              <div className="text-left">

                <div className="text-[11.5px] font-semibold text-ink-dim">المسدَّد</div>

                <div className="font-latin text-[18px] font-bold text-[#2e7d4f]">

                  {formatKwd(paidInstallmentTotal)} ({paidPercent}%)

                </div>

              </div>

            ) : null}

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <InfoRow

              label="الطالب"

              value={

                invoice.student ? (

                  <Link

                    href={`/dashboard/student-files/${invoice.student.id}`}

                    className="font-bold text-navy hover:underline"

                  >

                    {invoice.student.full_name}

                  </Link>

                ) : (

                  '—'

                )

              }

            />

            <InfoRow label="رقم الملف" value={invoice.student?.file_number ?? '—'} />

            <InfoRow

              label="الكوبون"

              value={

                invoice.coupon

                  ? `${invoice.coupon.code}${

                      invoice.coupon.type === 'percentage'

                        ? ` (${invoice.coupon.value}%)`

                        : invoice.coupon.value != null

                          ? ` (${formatKwd(invoice.coupon.value)})`

                          : ''

                    }`

                  : '—'

              }

            />

            <InfoRow label="طريقة الدفع" value={paymentLabel(invoice.payment_method)} />

            <InfoRow label="تاريخ الإنشاء" value={dateLabel(invoice.created_at)} />

            <InfoRow label="تاريخ الدفع" value={dateLabel(invoice.paid_at)} />

            {invoice.notes ? <InfoRow label="ملاحظات" value={invoice.notes} /> : null}

          </div>

        </div>



        {hasInstallments ? (

          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">

            <div className="border-b border-[#f0ece1] px-4 py-3.5">

              <h2 className="text-[15px] font-bold text-navy-800">دفعات التقسيط</h2>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px] border-collapse">

                <thead>

                  <tr className="bg-cream-soft">

                    {['رقم الدفعة', 'المبلغ', 'تاريخ الاستحقاق', 'الحالة', ''].map((c) => (

                      <th

                        key={c}

                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"

                      >

                        {c}

                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody>

                  {installments.map((inst) => (

                    <tr key={inst.id} className="border-t border-[#f4f1ea]">

                      <td className="font-latin px-4 py-3 text-[13px] font-bold text-ink">

                        #{inst.sequence}

                      </td>

                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy">

                        {formatKwd(inst.amount)}

                      </td>

                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">

                        {inst.due_date ?? '—'}

                      </td>

                      <td className="px-4 py-3">

                        <StatusBadge status={installmentBadgeStatus(inst)} />

                      </td>

                      <td className="px-4 py-3">

                        {canManage && isPending && inst.status !== 'paid' ? (

                          <button

                            type="button"

                            onClick={() => {

                              setPaymentMethod('cash');

                              setPayInstallmentTarget(inst);

                            }}

                            className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3 py-1.5 text-[12px] font-extrabold text-navy"

                          >

                            <Icon name="fa-solid fa-check" className="text-[10px]" />

                            تأكيد الدفع

                          </button>

                        ) : null}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>

        ) : null}



        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">

          <div className="border-b border-[#f0ece1] px-4 py-3.5">

            <h2 className="text-[15px] font-bold text-navy-800">بنود الفاتورة</h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[680px] border-collapse">

              <thead>

                <tr className="bg-cream-soft">

                  {['الوصف', 'سعر الوحدة', 'الكمية', 'الإجمالي'].map((c) => (

                    <th

                      key={c}

                      className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"

                    >

                      {c}

                    </th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {(invoice.items ?? []).map((item) => (

                  <tr key={item.id} className="border-t border-[#f4f1ea]">

                    <td className="px-4 py-3 text-[13px] text-ink">{item.description}</td>

                    <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">

                      {formatKwd(item.unit_price)}

                    </td>

                    <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">{item.quantity}</td>

                    <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy">

                      {formatKwd(item.line_total)}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <div className="border-t border-[#f0ece1] px-4 py-4">

            <div className="mr-auto max-w-[280px] space-y-2 text-[13.5px]">

              <div className="flex justify-between text-ink-soft">

                <span>المجموع الفرعي</span>

                <span className="font-latin font-semibold text-ink">{formatKwd(invoice.subtotal)}</span>

              </div>

              {showDiscount ? (

                <div className="flex justify-between text-ink-soft">

                  <span>الخصم</span>

                  <span className="font-latin font-semibold text-ink">

                    {formatKwd(invoice.discount_amount)}

                  </span>

                </div>

              ) : null}

              <div className="flex justify-between border-t border-cream-line pt-2 text-[16px] font-bold text-navy">

                <span>الإجمالي</span>

                <span className="font-latin">{formatKwd(invoice.total)}</span>

              </div>

            </div>

          </div>

        </section>

      </AdminContent>



      <FormModal

        open={payOpen}

        onClose={() => {

          if (!markPaidMutation.isPending) setPayOpen(false);

        }}

        title="تأكيد الدفع"

        eyebrow="PAYMENT"

        footer={

          <>

            <button

              type="button"

              onClick={() => setPayOpen(false)}

              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"

            >

              إلغاء

            </button>

            <button

              type="button"

              disabled={markPaidMutation.isPending}

              onClick={() => markPaidMutation.mutate()}

              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"

            >

              {markPaidMutation.isPending ? 'جاري التأكيد…' : 'تأكيد الدفع'}

            </button>

          </>

        }

      >

        <p className="mb-4 text-[13.5px] text-ink-dim">

          إجمالي الفاتورة{' '}

          <span className="font-latin font-bold text-navy">{formatKwd(invoice.total)}</span>. سيتم

          تفعيل الاشتراكات المرتبطة تلقائيًا.

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

                name="payment_method"

                className="accent-gold"

                checked={paymentMethod === m.id}

                onChange={() => setPaymentMethod(m.id)}

              />

              {m.label}

            </label>

          ))}

        </div>

      </FormModal>



      <FormModal

        open={Boolean(payInstallmentTarget)}

        onClose={() => {

          if (!markInstallmentMutation.isPending) setPayInstallmentTarget(null);

        }}

        title="تأكيد دفع الدفعة"

        eyebrow="INSTALLMENT"

        footer={

          <>

            <button

              type="button"

              onClick={() => setPayInstallmentTarget(null)}

              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"

            >

              إلغاء

            </button>

            <button

              type="button"

              disabled={markInstallmentMutation.isPending || !payInstallmentTarget}

              onClick={() => payInstallmentTarget && markInstallmentMutation.mutate(payInstallmentTarget)}

              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"

            >

              {markInstallmentMutation.isPending ? 'جاري التأكيد…' : 'تأكيد الدفع'}

            </button>

          </>

        }

      >

        {payInstallmentTarget ? (

          <>

            <p className="mb-4 text-[13.5px] text-ink-dim">

              دفعة #{payInstallmentTarget.sequence} —{' '}

              <span className="font-latin font-bold text-navy">

                {formatKwd(payInstallmentTarget.amount)}

              </span>

              . سيتم تفعيل الاشتراك عند أول دفعة مسدَّدة.

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

                    name="installment_payment_method"

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


