'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  apiClient,
  formatKwd,
  qs,
  type OutstandingStudentRow,
  type RevenueByMethodRow,
  type RevenuePeriodRow,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const CHART_COLORS = ['#c8a24a', '#1c4b8f', '#2e7d4f', '#6b4fa0', '#a34b4b'];

const th = 'px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim';

function paymentMethodLabel(method: string | null) {
  if (!method) return 'غير محدد';
  if (method === 'cash') return 'نقدًا';
  if (method === 'manual_transfer') return 'تحويل';
  if (method === 'online') return 'أونلاين';
  return method;
}

export function ReportsPage() {
  const canView = useAuthStore((s) => s.hasPermission('reports.view'));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const params = useMemo(() => {
    const p: Record<string, string> = { group_by: groupBy };
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to, groupBy]);

  const revenueQuery = useQuery({
    queryKey: ['reports-revenue', params],
    queryFn: () =>
      apiClient<{ data: RevenuePeriodRow[] }>(`/reports/revenue${qs(params)}`),
    enabled: canView,
  });

  const methodsQuery = useQuery({
    queryKey: ['reports-revenue-by-method', from, to],
    queryFn: () => {
      const p: Record<string, string> = {};
      if (from) p.from = from;
      if (to) p.to = to;
      return apiClient<{ data: RevenueByMethodRow[] }>(
        `/reports/revenue-by-payment-method${qs(p)}`,
      );
    },
    enabled: canView,
  });

  const outstandingQuery = useQuery({
    queryKey: ['reports-outstanding'],
    queryFn: () =>
      apiClient<{ data: OutstandingStudentRow[] }>('/reports/outstanding'),
    enabled: canView,
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="التقارير المالية" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const revenueRows = revenueQuery.data?.data ?? [];
  const methodRows = methodsQuery.data?.data ?? [];
  const outstandingRows = outstandingQuery.data?.data ?? [];

  const revenueMax = Math.max(...revenueRows.map((r) => Number(r.total)), 1);
  const methodsTotal = methodRows.reduce((s, r) => s + Number(r.total), 0);

  return (
    <>
      <AdminHeader title="التقارير المالية" crumb="إيرادات ومتأخرات" />

      <AdminContent className="flex flex-col gap-4">
        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy-800">فلتر الفترة</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-faint">ينطبق على الإيرادات وطرق الدفع</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px]"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-[12px] text-ink-dim">إلى</span>
              <input
                type="date"
                className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px]"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <select
                className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px]"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
              >
                <option value="day">يومي</option>
                <option value="week">أسبوعي</option>
                <option value="month">شهري</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <h2 className="mb-4 text-[15px] font-bold text-navy-800">الإيرادات</h2>
          {revenueQuery.isLoading ? (
            <TableSkeleton rows={2} cols={4} />
          ) : revenueRows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-chart-column"
              title="لا توجد إيرادات"
              body="لا توجد مدفوعات في الفترة المحددة."
            />
          ) : (
            <div className="relative flex h-[180px] items-end gap-2 border-b border-[#f0ece1] pb-6">
              {revenueRows.map((row, i) => (
                <div
                  key={row.period}
                  className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="font-latin text-[10px] text-ink-dim">
                    {formatKwd(row.total).replace(' د.ك', '')}
                  </span>
                  <div
                    className="w-full max-w-[42px] rounded-t-[8px] rounded-b-[3px]"
                    style={{
                      height: `${Math.max(8, Math.round((Number(row.total) / revenueMax) * 100))}%`,
                      background:
                        i === revenueRows.length - 1
                          ? 'linear-gradient(180deg,#e2c67f,#c8a24a)'
                          : 'linear-gradient(180deg,#c5cddd,#9fadc6)',
                    }}
                  />
                  <span className="absolute -bottom-5 max-w-full truncate text-[10px] text-ink-faint">
                    {row.period}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <h2 className="mb-4 text-[15px] font-bold text-navy-800">طرق الدفع</h2>
          {methodsQuery.isLoading ? (
            <TableSkeleton rows={2} cols={3} />
          ) : methodRows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-credit-card"
              title="لا توجد بيانات"
              body="لا توجد مدفوعات لتوزيعها حسب طريقة الدفع."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex h-6 overflow-hidden rounded-full bg-cream-soft">
                {methodRows.map((row, i) => {
                  const pct = methodsTotal > 0 ? (Number(row.total) / methodsTotal) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={row.payment_method ?? 'unknown'}
                      title={`${paymentMethodLabel(row.payment_method)}: ${formatKwd(row.total)}`}
                      style={{
                        width: `${pct}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  );
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {methodRows.map((row, i) => (
                  <div
                    key={row.payment_method ?? 'unknown'}
                    className="flex items-center justify-between rounded-[12px] border border-[#f0ece1] bg-cream-soft px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-[13px] font-semibold text-ink">
                        {paymentMethodLabel(row.payment_method)}
                      </span>
                    </div>
                    <span className="font-latin text-[13px] font-bold text-navy">
                      {formatKwd(row.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">المتأخرات</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-faint">مرتّبة حسب المبلغ المتأخر (الأكبر أولاً)</p>
          </div>
          {outstandingQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-cream-soft">
                    <th className={th}>الطالب</th>
                    <th className={th}>المبلغ المتأخر</th>
                    <th className={th}>فواتير معلّقة</th>
                    <th className={th}>أقساط معلّقة</th>
                    <th className={th}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8">
                        <EmptyState
                          icon="fa-solid fa-circle-check"
                          title="لا توجد متأخرات"
                          body="جميع الفواتير والأقساط مسدّدة."
                        />
                      </td>
                    </tr>
                  ) : (
                    outstandingRows.map((row) => (
                      <tr key={row.student_id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="px-4 py-3 font-semibold text-ink">{row.student_name}</td>
                        <td className="font-latin px-4 py-3 font-bold text-[#a34b4b]">
                          {formatKwd(row.outstanding_amount)}
                        </td>
                        <td className="font-latin px-4 py-3 text-center">{row.pending_invoices}</td>
                        <td className="font-latin px-4 py-3 text-center">{row.pending_installments}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/student-files/${row.student_id}`}
                            className="text-[12px] font-semibold text-gold-deep hover:underline"
                          >
                            ملف الطالب ←
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminContent>
    </>
  );
}
