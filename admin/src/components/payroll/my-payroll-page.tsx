'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient, formatKwd, type PayrollItem } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

function monthLabel(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-KW', { month: 'long', year: 'numeric' });
}

export function MyPayrollPage() {
  const canViewPayroll = useAuthStore((s) => s.hasPermission('teacher-portal.payroll'));

  const itemsQuery = useQuery({
    queryKey: ['me-payroll-items'],
    queryFn: () => apiClient<{ data: PayrollItem[] }>('/me/payroll-items'),
    enabled: canViewPayroll,
  });

  const items = itemsQuery.data?.data ?? [];

  if (!canViewPayroll) {
    return (
      <>
        <AdminHeader title="راتبي" crumb="غير متاح" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-user-lock"
            title="غير مصرح"
            body="ليس لديك صلاحية عرض راتبك."
          />
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="راتبي" crumb="كشف الرواتب الشخصية" />

      <AdminContent className="space-y-4">
        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">سجل رواتبي</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">عرض فقط — بدون تعديل</p>
          </div>

          {itemsQuery.isLoading ? (
            <div className="p-6 text-[13px] text-ink-dim">جاري التحميل…</div>
          ) : itemsQuery.isError ? (
            <EmptyState
              icon="fa-solid fa-triangle-exclamation"
              title="تعذر التحميل"
              body={(itemsQuery.error as Error).message}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-money-check-dollar"
              title="لا رواتب بعد"
              body="لم تُنشأ أي بنود راتب مرتبطة بحسابك."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الشهر', 'الأساس', 'خصومات', 'مكافأة', 'الصافي', 'حالة التشغيلة'].map(
                      (c) => (
                        <th
                          key={c}
                          className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">
                        {monthLabel(item.payroll_run?.period_month)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink">
                        {item.base_amount != null ? formatKwd(item.base_amount) : '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {formatKwd(item.deductions)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {formatKwd(item.bonus)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-extrabold text-navy">
                        {item.net_amount != null ? formatKwd(item.net_amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {item.payroll_run?.status ? (
                          <StatusBadge status={item.payroll_run.status} />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminContent>
    </>
  );
}
