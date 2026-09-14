'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveType,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function MyLeavesPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.roles.includes('teacher') ?? false;
  const canViewLeaves = useAuthStore((s) => s.hasPermission('teacher-portal.leaves'));
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const ready = isTeacher && canViewLeaves;

  const balancesQuery = useQuery({
    queryKey: ['me-leave-balances'],
    queryFn: async () => {
      const res = await apiClient<{ data: LeaveBalance[] } | LeaveBalance[]>('/me/leave-balances');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: ready,
  });

  const requestsQuery = useQuery({
    queryKey: ['me-leave-requests'],
    queryFn: () =>
      apiClient<Paginated<LeaveRequest>>(`/me/leave-requests${qs({ per_page: 50 })}`),
    enabled: ready,
  });

  const typesQuery = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient<Paginated<LeaveType>>(`/leave-types${qs({ per_page: 100 })}`),
    enabled: ready && open,
  });

  const leaveTypes = typesQuery.data?.data ?? [];
  const balances = balancesQuery.data ?? [];
  const rows = requestsQuery.data?.data ?? [];

  const balanceByType = useMemo(() => {
    const map = new Map<number, LeaveBalance>();
    for (const b of balances) map.set(b.leave_type_id, b);
    return map;
  }, [balances]);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient<{
        data: LeaveRequest;
        insufficient_balance?: boolean;
        requested_days?: number;
        remaining_days?: number;
      }>('/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          leave_type_id: Number(leaveTypeId),
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
        }),
      }),
    onSuccess: (res) => {
      if (res.insufficient_balance) {
        toast.warning(
          `تم إرسال الطلب مع تنبيه: الرصيد غير كافٍ (${res.requested_days} يوم مطلوب، المتبقي ${res.remaining_days}).`,
        );
      } else {
        toast.success('تم إرسال طلب الإجازة');
      }
      setOpen(false);
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      void qc.invalidateQueries({ queryKey: ['me-leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['me-leave-balances'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isTeacher || !canViewLeaves) {
    return (
      <>
        <AdminHeader title="إجازاتي" crumb="غير متاح" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-user-lock"
            title={!isTeacher ? 'هذه الصفحة للمعلمين' : 'غير مصرح'}
            body={
              !isTeacher
                ? 'لا يوجد دور معلم مرتبط بحسابك.'
                : 'ليس لديك صلاحية عرض إجازاتك.'
            }
          />
        </AdminContent>
      </>
    );
  }

  const canSubmit =
    Boolean(leaveTypeId) &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    reason.trim().length > 0 &&
    !submitMutation.isPending;

  function resetAndClose() {
    if (submitMutation.isPending) return;
    setOpen(false);
  }

  return (
    <>
      <AdminHeader title="إجازاتي" crumb="بوابة المعلم ← إجازاتي" />
      <AdminContent className="space-y-5">
        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-navy-800">رصيد الإجازات</h2>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-navy-800 px-4 py-2 text-[12.5px] font-extrabold text-gold"
            >
              طلب إجازة
            </button>
          </div>
          {balancesQuery.isLoading ? (
            <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
          ) : balances.length === 0 ? (
            <p className="text-[13px] text-ink-dim">لا أرصدة مسجّلة لهذا العام.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {balances.map((b) => (
                <li
                  key={b.id}
                  className="rounded-[14px] border border-cream-line bg-cream-soft px-3 py-2.5"
                >
                  <p className="text-[12px] font-bold text-ink-dim">
                    {b.leave_type?.name ?? 'إجازة'}
                  </p>
                  <p className="mt-1 text-[18px] font-extrabold text-navy-800">
                    {b.remaining_days}{' '}
                    <span className="text-[12px] font-bold text-ink-soft">يوم متبقٍ</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-dim">
                    الإجمالي {b.total_days} · المستخدم {b.used_days}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">طلباتي</h2>
          </div>
          {requestsQuery.isLoading ? <TableSkeleton cols={5} /> : null}
          {!requestsQuery.isLoading && rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-plane-departure"
              title="لا طلبات بعد"
              body="اضغط «طلب إجازة» لإرسال طلب جديد."
            />
          ) : null}
          {!requestsQuery.isLoading && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['النوع', 'من', 'إلى', 'الحالة', 'السبب'].map((c) => (
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
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea]">
                      <td className="px-4 py-3 text-[13px] font-bold text-navy-800">
                        {row.leave_type?.name ??
                          balanceByType.get(row.leave_type_id)?.leave_type?.name ??
                          `#${row.leave_type_id}`}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {row.start_date}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {row.end_date}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-[13px] text-ink-soft">
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </AdminContent>

      <FormModal
        open={open}
        onClose={resetAndClose}
        title="طلب إجازة جديد"
        footer={
          <>
            <button
              type="button"
              onClick={resetAndClose}
              disabled={submitMutation.isPending}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => submitMutation.mutate()}
              className="rounded-full bg-navy-800 px-5 py-2.5 text-[13.5px] font-extrabold text-gold disabled:opacity-60"
            >
              {submitMutation.isPending ? 'جاري الإرسال…' : 'إرسال الطلب'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <label className="block">
            <span className={formLabelClass}>نوع الإجازة</span>
            <select
              className={formFieldClass}
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
            >
              <option value="">اختر النوع…</option>
              {leaveTypes.map((t) => {
                const bal = balanceByType.get(t.id);
                return (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {bal != null ? ` (متبقي ${bal.remaining_days})` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={formLabelClass}>من تاريخ</span>
              <input
                type="date"
                className={formFieldClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={formLabelClass}>إلى تاريخ</span>
              <input
                type="date"
                className={formFieldClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="block">
            <span className={formLabelClass}>السبب</span>
            <textarea
              className={`${formFieldClass} min-h-[90px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
        </div>
      </FormModal>
    </>
  );
}
