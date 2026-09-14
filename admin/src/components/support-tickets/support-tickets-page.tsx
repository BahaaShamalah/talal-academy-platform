'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type AdminUser,
  type Paginated,
  type SupportTicket,
  type SupportTicketStatus,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const OPEN_STATUSES: SupportTicketStatus[] = ['new', 'in_progress'];
const ALL_STATUSES: SupportTicketStatus[] = ['new', 'in_progress', 'replied', 'closed'];
const STATUS_FILTER_LABEL: Record<SupportTicketStatus, string> = {
  new: 'جديد',
  in_progress: 'قيد المعالجة',
  replied: 'تم الرد',
  closed: 'مغلق',
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return String(dt).slice(0, 16).replace('T', ' ');
}

function lastMessageAt(ticket: SupportTicket) {
  const msgs = ticket.messages ?? [];
  if (msgs.length > 0) {
    return msgs[msgs.length - 1]?.created_at ?? ticket.updated_at;
  }
  return ticket.updated_at;
}

export function SupportTicketsPage() {
  const canView = useAuthStore((s) => s.hasPermission('support-tickets.view'));
  const canManage = useAuthStore((s) => s.hasPermission('support-tickets.manage'));
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [statusSet, setStatusSet] = useState<Set<SupportTicketStatus>>(() => new Set(OPEN_STATUSES));
  const [openId, setOpenId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  const query = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () =>
      apiClient<Paginated<SupportTicket>>(`/support-tickets${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const rows = useMemo(() => {
    const all = query.data?.data ?? [];
    if (statusSet.size === 0) return all;
    return all.filter((r) => statusSet.has(r.status));
  }, [query.data, statusSet]);

  const detailQuery = useQuery({
    queryKey: ['support-ticket', openId],
    queryFn: () => apiClient<SupportTicket>(`/support-tickets/${openId}`),
    enabled: canView && openId !== null,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users-assign'],
    queryFn: () => apiClient<Paginated<AdminUser>>(`/users${qs({ per_page: 100 })}`),
    enabled: canManage && openId !== null,
  });

  const ticket = detailQuery.data;
  const messages = ticket?.messages ?? [];

  function toggleStatus(s: SupportTicketStatus) {
    setStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const replyMutation = useMutation({
    mutationFn: () =>
      apiClient(`/support-tickets/${openId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      }),
    onSuccess: () => {
      toast.success('تم إرسال الرد');
      setReply('');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-ticket', openId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: number) =>
      apiClient(`/support-tickets/${openId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: () => {
      toast.success('تم الإسناد');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-ticket', openId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiClient(`/support-tickets/${openId}/close`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      toast.success('أُغلقت التذكرة');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-ticket', openId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="التواصل" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="التواصل" crumb="الدعم ← التذاكر" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">التذاكر التي تحتاج متابعة افتراضيًا</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => {
                const on = statusSet.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
                      on
                        ? 'border-navy-800 bg-navy-800 text-white'
                        : 'border-cream-line bg-white text-ink-dim'
                    }`}
                  >
                    {STATUS_FILTER_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-inbox" title="لا تذاكر" body="لا توجد تذاكر بهذه الحالات." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الموضوع', 'ولي الأمر', 'الطالب', 'الحالة', 'المسؤول', 'آخر رسالة', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13px] font-bold text-navy-800">{row.subject}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{row.guardian?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{row.student?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status === 'closed' ? 'closed_ticket' : row.status} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{row.assignee?.name ?? 'غير مُسنَد'}</td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-soft">
                        {fmt(lastMessageAt(row))}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(row.id);
                            setReply('');
                            setAssignUserId(row.assigned_to ? String(row.assigned_to) : '');
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-white px-2.5 py-1 text-[11.5px] font-semibold text-navy-800"
                        >
                          <Icon name="fa-solid fa-comments" className="text-[10px]" />
                          فتح
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminContent>

      <FormModal
        extraWide
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title={ticket?.subject ?? 'التذكرة'}
        eyebrow={ticket ? `تذكرة #${ticket.id}` : 'تفاصيل'}
        footer={
          canManage && ticket && ticket.status !== 'closed' ? (
            <>
              <button
                type="button"
                disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate()}
                className="rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-semibold text-ink-dim"
              >
                إغلاق التذكرة
              </button>
            </>
          ) : undefined
        }
      >
        {detailQuery.isLoading || !ticket ? (
          <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
              <StatusBadge status={ticket.status === 'closed' ? 'closed_ticket' : ticket.status} />
              <span>ولي الأمر: {ticket.guardian?.full_name ?? '—'}</span>
              {ticket.student ? <span>· الطالب: {ticket.student.full_name}</span> : null}
              <span>· المسؤول: {ticket.assignee?.name ?? 'غير مُسنَد'}</span>
            </div>

            {canManage && ticket.status !== 'closed' ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <label className={formLabelClass}>إسناد إلى</label>
                  <select
                    className={formFieldClass}
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  >
                    <option value="">اختر موظفًا</option>
                    {(usersQuery.data?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!assignUserId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate(Number(assignUserId))}
                  className="rounded-full border border-cream-line bg-white px-3 py-2 text-[12px] font-semibold"
                >
                  إسناد
                </button>
                {me?.id ? (
                  <button
                    type="button"
                    disabled={assignMutation.isPending}
                    onClick={() => {
                      setAssignUserId(String(me.id));
                      assignMutation.mutate(me.id);
                    }}
                    className="rounded-full bg-navy-800 px-3 py-2 text-[12px] font-semibold text-white"
                  >
                    إسناد لي
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto rounded-2xl border border-cream-line bg-cream-soft p-3">
              {messages.length === 0 ? (
                <p className="text-[13px] text-ink-dim">لا رسائل بعد.</p>
              ) : (
                messages.map((m) => {
                  const isGuardian = m.sender_type === 'guardian';
                  const name = isGuardian
                    ? m.sender_guardian?.full_name ?? 'ولي الأمر'
                    : m.sender_user?.name ?? 'موظف';
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        isGuardian
                          ? 'self-start bg-white text-navy-800 shadow-sm'
                          : 'self-end bg-navy-800 text-white'
                      }`}
                    >
                      <div className={`mb-1 text-[11px] font-bold ${isGuardian ? 'text-ink-dim' : 'text-gold-soft'}`}>
                        {name}
                      </div>
                      <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.message}</div>
                      <div className={`font-latin mt-1 text-[10px] ${isGuardian ? 'text-ink-faint' : 'text-white/60'}`}>
                        {fmt(m.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {canManage && ticket.status !== 'closed' ? (
              <div>
                <label className={formLabelClass}>رد جديد</label>
                <textarea
                  className={`${formFieldClass} min-h-[90px]`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="اكتب الرد هنا…"
                />
                <button
                  type="button"
                  disabled={!reply.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                  className="mt-2 rounded-full bg-gold px-4 py-2 text-[12.5px] font-bold text-navy-800"
                >
                  إرسال الرد
                </button>
              </div>
            ) : null}
          </div>
        )}
      </FormModal>
    </>
  );
}
