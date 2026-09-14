'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  formatKwd,
  qs,
  type OrderStatus,
  type Paginated,
  type StoreOrder,
} from '@/lib/api-client';
import {
  FULFILLMENT_TYPES,
  nextOrderStatuses,
  ORDER_STATUSES,
} from '@/lib/order-utils';
import { useAuthStore } from '@/stores/auth-store';

export function OrdersPage() {
  const canView = useAuthStore((s) => s.hasPermission('orders.view'));
  const canManage = useAuthStore((s) => s.hasPermission('orders.manage'));
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [statusMenuOrderId, setStatusMenuOrderId] = useState<number | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['orders', statusFilter, fulfillmentFilter],
    queryFn: () =>
      apiClient<Paginated<StoreOrder>>(
        `/orders${qs({
          include: 'student,invoice,deliveryZone,branch',
          per_page: 50,
          'filter[status]': statusFilter || undefined,
          'filter[fulfillment_type]': fulfillmentFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      apiClient(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث حالة الطلب');
      setStatusMenuOrderId(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['student-orders'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const orders = ordersQuery.data?.data ?? [];
  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  if (!canView) {
    return (
      <>
        <AdminHeader title="الطلبات" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  const loading = ordersQuery.isLoading;
  const isEmpty = !loading && orders.length === 0;

  return (
    <>
      <AdminHeader title="الطلبات" crumb="المتجر ← الطلبات" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">{orders.length} طلب</div>
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">كل الحالات</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
            >
              <option value="">كل أنواع التسليم</option>
              {FULFILLMENT_TYPES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? <TableSkeleton cols={8} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-bag-shopping"
              title="لا توجد طلبات"
              body="ستظهر طلبات المذكرات هنا عند إنشائها."
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الفاتورة',
                      'الطالب',
                      'التسليم',
                      'المنطقة / الفرع',
                      'الإجمالي',
                      'الحالة',
                      ...(canManage ? [''] : []),
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
                  {orders.map((order) => {
                    const nextStatuses = nextOrderStatuses(order.status, order.fulfillment_type);
                    const locationLabel =
                      order.fulfillment_type === 'delivery'
                        ? (order.delivery_zone?.name ?? '—')
                        : (order.branch?.name ?? '—');

                    return (
                      <tr key={order.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px]">
                          {order.invoice_id ? (
                            <Link
                              href={`/dashboard/invoices/${order.invoice_id}`}
                              className="font-bold text-navy hover:underline"
                            >
                              {order.invoice?.invoice_number ?? `#${order.invoice_id}`}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[13.5px] font-bold text-ink">
                            {order.student?.full_name ?? '—'}
                          </div>
                          <div className="font-latin mt-0.5 text-[11.5px] text-ink-dim">
                            {order.student?.file_number ?? ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.fulfillment_type} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink-soft">{locationLabel}</td>
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy">
                          {order.invoice?.total != null ? formatKwd(order.invoice.total) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        {canManage ? (
                          <td className="relative px-4 py-3">
                            {nextStatuses.length > 0 ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusMenuOrderId(
                                      statusMenuOrderId === order.id ? null : order.id,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3 py-1.5 text-[12px] font-bold text-navy"
                                >
                                  <Icon name="fa-solid fa-arrows-rotate" className="text-[10px]" />
                                  تحديث الحالة
                                </button>
                                {statusMenuOrderId === order.id ? (
                                  <div className="absolute left-4 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-cream-line bg-white shadow-lg">
                                    {nextStatuses.map((opt) => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        disabled={statusMutation.isPending}
                                        onClick={() =>
                                          statusMutation.mutate({
                                            orderId: order.id,
                                            status: opt.value,
                                          })
                                        }
                                        className="block w-full px-3.5 py-2.5 text-right text-[13px] font-semibold text-ink hover:bg-cream-soft"
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[12px] text-ink-faint">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>
    </>
  );
}
