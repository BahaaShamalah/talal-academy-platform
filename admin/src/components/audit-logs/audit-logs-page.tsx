'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type AdminUser,
  type AuditLog,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const ACTION_OPTIONS = [
  { value: '', label: 'كل الإجراءات' },
  { value: 'invoice.mark_paid', label: 'تأكيد دفع فاتورة' },
  { value: 'invoice.refund', label: 'استرداد فاتورة' },
  { value: 'subscription.changed', label: 'تغيير اشتراك' },
  { value: 'subscription.frozen', label: 'تجميد اشتراك' },
  { value: 'subscription.unfrozen', label: 'إنهاء تجميد' },
  { value: 'role.permissions_updated', label: 'تحديث صلاحيات دور' },
  { value: 'role.deleted', label: 'حذف دور' },
  { value: 'schedule.conflict_overridden', label: 'تجاوز تعارض جدول' },
  { value: 'student.transferred_group', label: 'نقل طالب بين شعب' },
];

function actorName(row: AuditLog) {
  if (row.user?.name) return row.user.name;
  if (row.guardian?.name) return `ولي الأمر: ${row.guardian.name}`;
  if (row.guardian_id) return 'ولي أمر';
  return 'النظام';
}

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return String(dt).slice(0, 19).replace('T', ' ');
}

export function AuditLogsPage() {
  const canView = useAuthStore((s) => s.hasPermission('audit-logs.view'));
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users-audit'],
    queryFn: () => apiClient<Paginated<AdminUser>>(`/users${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const query = useQuery({
    queryKey: ['audit-logs', action, userId, from, to],
    queryFn: () =>
      apiClient<Paginated<AuditLog>>(
        `/audit-logs${qs({
          per_page: 50,
          'filter[action]': action || undefined,
          'filter[user_id]': userId || undefined,
          'filter[from]': from || undefined,
          'filter[to]': to || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  if (!canView) {
    return (
      <>
        <AdminHeader title="سجل التدقيق" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">صلاحية المسؤول فقط.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="سجل التدقيق" crumb="النظام ← التدقيق" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="grid gap-2.5 border-b border-[#f0ece1] p-3.5 sm:grid-cols-4">
            <div>
              <label className={formLabelClass}>الإجراء</label>
              <select className={formFieldClass} value={action} onChange={(e) => setAction(e.target.value)}>
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formLabelClass}>المستخدم</label>
              <select className={formFieldClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">الكل</option>
                {(usersQuery.data?.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formLabelClass}>من تاريخ</label>
              <input type="date" className={formFieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={formLabelClass}>إلى تاريخ</label>
              <input type="date" className={formFieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-clipboard" title="لا سجلات" body="لا توجد أحداث تطابق الفلاتر." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['التاريخ', 'المستخدم / ولي الأمر', 'الإجراء', 'الوصف'].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea]">
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-soft">
                        {fmt(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-navy-800">{actorName(row)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.action} />
                      </td>
                      <td className="px-4 py-3 text-[13px] leading-relaxed text-ink-soft">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminContent>
    </>
  );
}
