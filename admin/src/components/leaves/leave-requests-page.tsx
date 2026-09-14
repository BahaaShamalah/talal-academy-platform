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
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type ClassSession,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveType,
  type Paginated,
  type SubstituteSuggestionRow,
  type TeacherUser,
} from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';
import { useAuthStore } from '@/stores/auth-store';

function dayCount(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function LeaveRequestsPage() {
  const canView = useAuthStore((s) => s.hasPermission('leaves.view'));
  const canManage = useAuthStore((s) => s.hasPermission('leaves.manage'));
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approvedLeave, setApprovedLeave] = useState<LeaveRequest | null>(null);
  const [suggestionsFor, setSuggestionsFor] = useState<ClassSession | null>(null);
  const [manualTeacherId, setManualTeacherId] = useState('');

  const query = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: () =>
      apiClient<Paginated<LeaveRequest>>(
        `/leave-requests${qs({
          per_page: 100,
          'filter[status]': statusFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const typesQuery = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient<Paginated<LeaveType>>(`/leave-types${qs({ per_page: 100 })}`),
    enabled: canView,
  });
  const leaveTypes = typesQuery.data?.data ?? [];

  const rows = query.data?.data ?? [];
  const userIds = useMemo(() => [...new Set(rows.map((r) => r.user_id))], [rows]);

  const balancesQuery = useQuery({
    queryKey: ['leave-balances-batch', userIds.join(',')],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const map: Record<number, LeaveBalance[]> = {};
      await Promise.all(
        userIds.map(async (id) => {
          const res = await apiClient<{ data?: LeaveBalance[] } | LeaveBalance[]>(
            `/users/${id}/leave-balances${qs({ year })}`,
          );
          map[id] = Array.isArray(res) ? res : res.data ?? [];
        }),
      );
      return map;
    },
    enabled: canView && userIds.length > 0,
  });

  function exceedsBalance(row: LeaveRequest) {
    const days = dayCount(row.start_date, row.end_date);
    const year = Number(row.start_date.slice(0, 4));
    const balances = balancesQuery.data?.[row.user_id] ?? [];
    const bal = balances.find((b) => b.leave_type_id === row.leave_type_id && b.year === year);
    const type = leaveTypes.find((t) => t.id === row.leave_type_id);
    const remaining = bal?.remaining_days ?? type?.default_annual_balance ?? 0;
    return days > remaining;
  }

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) =>
      apiClient<{ data: LeaveRequest }>(`/leave-requests/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes: notes || null }),
      }),
    onSuccess: (res, vars) => {
      toast.success(vars.decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض');
      setRejectTarget(null);
      setRejectNotes('');
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      const leave = res.data;
      if (vars.decision === 'approved' && leave?.user?.is_teaching_staff) {
        setApprovedLeave(leave);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const suggestionsQuery = useQuery({
    queryKey: ['substitute-suggestions', approvedLeave?.id],
    queryFn: async () => {
      const res = await apiClient<{ data: SubstituteSuggestionRow[] }>(
        `/leave-requests/${approvedLeave!.id}/substitute-suggestions`,
      );
      return res.data ?? [];
    },
    enabled: Boolean(approvedLeave),
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers-list'],
    queryFn: () => apiClient<Paginated<TeacherUser>>(`/teachers${qs({ per_page: 100 })}`),
    enabled: Boolean(suggestionsFor),
  });

  const assignMutation = useMutation({
    mutationFn: (teacherId: number) =>
      apiClient(`/sessions/${suggestionsFor!.id}/assign-substitute`, {
        method: 'POST',
        body: JSON.stringify({ teacher_id: teacherId }),
      }),
    onSuccess: () => {
      toast.success('تم تعيين المعلم البديل');
      setSuggestionsFor(null);
      setManualTeacherId('');
      qc.invalidateQueries({ queryKey: ['substitute-suggestions', approvedLeave?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="طلبات الإجازة" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  const substituteRows = suggestionsQuery.data ?? [];

  return (
    <>
      <AdminHeader title="طلبات الإجازة" crumb="الموارد البشرية ← طلبات الإجازة" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              {statusFilter === 'pending' ? 'الطلبات قيد الانتظار' : 'كل الطلبات حسب الفلتر'}
            </p>
            <select
              className={`${formFieldClass} w-auto min-w-[160px] py-2 text-[13px]`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليها</option>
              <option value="rejected">مرفوضة</option>
              <option value="">الكل</option>
            </select>
          </div>

          {query.isLoading ? <TableSkeleton cols={6} /> : null}
          {!query.isLoading && rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-plane-departure"
              title={statusFilter === 'pending' ? 'لا طلبات معلّقة' : 'لا طلبات'}
              body="لا توجد طلبات مطابقة للفلتر."
            />
          ) : null}

          {!query.isLoading && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الموظف', 'النوع', 'من — إلى', 'الحالة', 'الرصيد', ...(canManage ? [''] : [])].map((c, i) => (
                      <th key={`${c}-${i}`} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13px] font-bold">{row.user?.name ?? `#${row.user_id}`}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{row.leave_type?.name ?? '—'}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">
                        {row.start_date} — {row.end_date}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        {exceedsBalance(row) ? (
                          <span className="rounded-full bg-[#f8ecec] px-2.5 py-1 text-[11px] font-bold text-[#a34b4b]">
                            يتجاوز الرصيد
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-dim">ضمن الرصيد</span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          {row.status === 'pending' ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={reviewMutation.isPending}
                                onClick={() =>
                                  reviewMutation.mutate({ id: row.id, decision: 'approved' })
                                }
                                className="rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-2.5 py-1 text-[11.5px] font-semibold text-[#2e7d4f]"
                              >
                                موافقة
                              </button>
                              <button
                                type="button"
                                disabled={reviewMutation.isPending}
                                onClick={() => {
                                  setRejectTarget(row);
                                  setRejectNotes('');
                                }}
                                className="rounded-full border border-[#f2dede] bg-[#f8ecec] px-2.5 py-1 text-[11.5px] font-semibold text-[#a34b4b]"
                              >
                                رفض
                              </button>
                            </div>
                          ) : row.status === 'approved' && row.user?.is_teaching_staff ? (
                            <button
                              type="button"
                              onClick={() => setApprovedLeave(row)}
                              className="text-[12px] font-bold text-navy hover:underline"
                            >
                              البديل
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {approvedLeave ? (
          <div className="mt-4 overflow-hidden rounded-[18px] border border-cream-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-extrabold text-navy">جلسات تحتاج معلم بديل</h3>
              <button
                type="button"
                onClick={() => setApprovedLeave(null)}
                className="text-[12px] text-ink-dim hover:underline"
              >
                إخفاء
              </button>
            </div>
            {suggestionsQuery.isLoading ? <TableSkeleton rows={2} /> : null}
            {!suggestionsQuery.isLoading && substituteRows.length === 0 ? (
              <p className="text-[13px] text-ink-dim">لا جلسات معلّمة تحتاج بديلاً لهذه الإجازة.</p>
            ) : null}
            {substituteRows.map((row) => (
              <div
                key={row.session.id}
                className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-line bg-[#fbfaf7] px-3.5 py-2.5"
              >
                <div>
                  <div className="text-[13px] font-bold text-ink">
                    {row.session.class_offering?.label ?? `جلسة #${row.session.id}`}
                  </div>
                  <div className="font-latin text-[12px] text-ink-dim">
                    {row.session.session_date} · {formatTimeRange12h(row.session.start_time, row.session.end_time)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSuggestionsFor(row.session);
                    setManualTeacherId('');
                  }}
                  className="rounded-full border border-cream-line2 bg-white px-3 py-1.5 text-[12px] font-bold text-navy"
                >
                  عرض المقترحين ({row.suggestions.length})
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </AdminContent>

      <FormModal
        open={Boolean(rejectTarget)}
        onClose={() => {
          if (!reviewMutation.isPending) setRejectTarget(null);
        }}
        title="رفض طلب الإجازة"
        eyebrow="REJECT"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={reviewMutation.isPending || !rejectNotes.trim()}
              onClick={() =>
                rejectTarget &&
                reviewMutation.mutate({
                  id: rejectTarget.id,
                  decision: 'rejected',
                  notes: rejectNotes.trim(),
                })
              }
              className="rounded-full bg-[#a34b4b] px-6 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
            >
              تأكيد الرفض
            </button>
          </>
        }
      >
        <label className={formLabelClass}>سبب الرفض</label>
        <textarea
          className={formFieldClass}
          rows={3}
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </FormModal>

      <FormModal
        open={Boolean(suggestionsFor)}
        onClose={() => {
          if (!assignMutation.isPending) setSuggestionsFor(null);
        }}
        title="تعيين معلم بديل"
        eyebrow="SUBSTITUTE"
        footer={
          <button
            type="button"
            onClick={() => setSuggestionsFor(null)}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        {suggestionsFor ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-soft">
              الجلسة: <span className="font-latin font-bold">{suggestionsFor.session_date}</span>
            </p>
            {(substituteRows.find((r) => r.session.id === suggestionsFor.id)?.suggestions ?? []).length ===
            0 ? (
              <p className="text-[12.5px] text-ink-dim">لا مقترحين مؤهلين — اختر معلمًا يدويًا.</p>
            ) : (
              <div className="space-y-1.5">
                {(substituteRows.find((r) => r.session.id === suggestionsFor.id)?.suggestions ?? []).map(
                  (s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={assignMutation.isPending}
                      onClick={() => assignMutation.mutate(s.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-cream-line bg-white px-3.5 py-2.5 text-right hover:bg-cream-soft"
                    >
                      <span className="text-[13px] font-bold">{s.name}</span>
                      <span className="text-[11.5px] text-navy">اختيار</span>
                    </button>
                  ),
                )}
              </div>
            )}
            <div>
              <label className={formLabelClass}>أو معلم يدوي</label>
              <div className="flex gap-2">
                <select
                  className={formFieldClass}
                  value={manualTeacherId}
                  onChange={(e) => setManualTeacherId(e.target.value)}
                >
                  <option value="">اختر…</option>
                  {(teachersQuery.data?.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!manualTeacherId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate(Number(manualTeacherId))}
                  className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[12.5px] font-extrabold text-navy disabled:opacity-70"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
