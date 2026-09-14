'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  type NotificationTemplate,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const EVENT_VARS: Record<string, string[]> = {
  payment_received: ['student_name', 'amount', 'invoice_number'],
  invoice_overdue: ['student_name', 'amount', 'due_date', 'installment_id'],
  invoice_issued: ['student_name', 'amount', 'invoice_number'],
  attendance_absent: ['student_name', 'session_date'],
  exam_result_published: ['student_name', 'exam_title', 'score', 'max_score'],
  leave_request_submitted: ['staff_name', 'leave_type', 'start_date', 'end_date'],
  leave_request_approved: ['leave_type', 'start_date', 'end_date'],
  leave_request_rejected: ['leave_type', 'start_date', 'end_date'],
  private_lesson_booking_requested: ['student_name', 'subject', 'teacher', 'status', 'booking_id'],
  private_lesson_booking_confirmed: ['student_name', 'subject', 'teacher', 'slot', 'invoice_id'],
  support_ticket_created: ['guardian_name', 'subject', 'ticket_id'],
  support_ticket_staff_reply: ['subject', 'ticket_id'],
  support_ticket_guardian_reply: ['subject', 'ticket_id'],
  support_ticket_closed: ['subject', 'ticket_id'],
  enrollment_created: ['student_name', 'subject', 'grade'],
  waiting_list_enrolled: ['student_name', 'subject'],
  educational_material_published: ['student_name', 'title'],
  evaluation_posted: ['student_name', 'subject'],
  subscription_activated: ['student_name', 'plan_name'],
};

const CHANNEL_LABEL: Record<string, string> = {
  in_app: 'داخل النظام',
  email: 'إيميل',
  whatsapp: 'واتساب',
};

export function NotificationTemplatesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('notifications.manage'));
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState({ name_ar: '', subject: '', body_template: '', is_active: true });

  const query = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () =>
      apiClient<Paginated<NotificationTemplate>>(`/notification-templates${qs({ per_page: 100 })}`),
    enabled: canManage,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient(`/notification-templates/${editing!.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name_ar: form.name_ar.trim(),
          subject: form.subject.trim() || null,
          body_template: form.body_template,
          is_active: form.is_active,
        }),
      }),
    onSuccess: () => {
      toast.success('تم حفظ القالب');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <>
        <AdminHeader title="قوالب الإشعارات" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">صلاحية إدارية فقط.</AdminContent>
      </>
    );
  }

  const hintVars = editing ? EVENT_VARS[editing.event_key] ?? ['student_name', 'amount'] : [];

  return (
    <>
      <AdminHeader title="قوالب الإشعارات" crumb="النظام ← القوالب" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          {query.isLoading ? (
            <TableSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-bell-slash" title="لا قوالب" body="لم تُزرع قوالب بعد." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الحدث', 'القناة', 'الحالة', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-bold text-navy-800">{row.name_ar}</div>
                        <div className="font-latin text-[11px] text-ink-faint">{row.event_key}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.channel} />
                        <span className="sr-only">{CHANNEL_LABEL[row.channel]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(row);
                            setForm({
                              name_ar: row.name_ar,
                              subject: row.subject ?? '',
                              body_template: row.body_template,
                              is_active: row.is_active,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-white px-2.5 py-1 text-[11.5px] font-semibold"
                        >
                          <Icon name="fa-solid fa-pen" className="text-[10px]" />
                          تعديل النص
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
        wide
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `تعديل: ${editing.name_ar}` : ''}
        eyebrow={editing?.event_key}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-cream-line px-4 py-2 text-[12.5px] font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-navy-800 px-4 py-2 text-[12.5px] font-semibold text-white"
            >
              حفظ
            </button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={formLabelClass}>الاسم</label>
              <input
                className={formFieldClass}
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              />
            </div>
            {editing.channel === 'email' ? (
              <div>
                <label className={formLabelClass}>عنوان الإيميل</label>
                <input
                  className={formFieldClass}
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
            ) : null}
            <div>
              <label className={formLabelClass}>نص القالب</label>
              <p className="mb-1.5 text-[11.5px] text-ink-dim">
                المتغيرات المتاحة:{' '}
                {hintVars.map((v) => (
                  <code key={v} className="font-latin mx-0.5 rounded bg-cream-soft px-1.5 py-0.5 text-[11px]">
                    {`{{${v}}}`}
                  </code>
                ))}
              </p>
              <textarea
                className={`${formFieldClass} min-h-[140px]`}
                value={form.body_template}
                onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              نشط
            </label>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
