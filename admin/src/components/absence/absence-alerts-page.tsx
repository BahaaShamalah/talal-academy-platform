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
  qs,
  type AbsenceAlert,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function AbsenceAlertsPage() {
  const canView = useAuthStore((s) => s.hasPermission('attendance.view'));
  const canManage = useAuthStore((s) => s.hasPermission('attendance.manage'));
  const qc = useQueryClient();

  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const query = useQuery({
    queryKey: ['absence-alerts', showAcknowledged],
    queryFn: () =>
      apiClient<Paginated<AbsenceAlert>>(
        `/absence-alerts${qs({
          include: 'student,classOffering.subject',
          'filter[acknowledged]': showAcknowledged ? undefined : false,
          per_page: 100,
        })}`,
      ),
    enabled: canView,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient(`/absence-alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      toast.success('تمت المعالجة');
      qc.invalidateQueries({ queryKey: ['absence-alerts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = query.data?.data ?? [];

  if (!canView) {
    return (
      <>
        <AdminHeader title="تنبيهات الغياب" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="تنبيهات الغياب" crumb="الحضور ← تنبيهات الغياب" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              {showAcknowledged ? 'كل التنبيهات' : 'التنبيهات غير المُعالَجة'}
            </p>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" checked={showAcknowledged} onChange={(e) => setShowAcknowledged(e.target.checked)} />
              عرض المُعالَجة أيضًا
            </label>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-bell-slash"
              title={showAcknowledged ? 'لا توجد تنبيهات' : 'لا توجد تنبيهات معلّقة'}
              body={showAcknowledged ? 'لم يُسجَّل أي تنبيه.' : 'كل التنبيهات مُعالَجة — عمل رائع!'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الطالب', 'المادة', 'غيابات متتالية', 'المستوى', 'التاريخ', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3">
                        {row.student ? (
                          <Link href={`/dashboard/student-files/${row.student.id}`} className="text-[13px] font-bold text-navy hover:underline">
                            {row.student.full_name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">
                        {row.class_offering?.subject?.name ?? '—'}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] font-bold">{row.consecutive_count}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.alert_level} /></td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-soft">
                        {row.triggered_at ? String(row.triggered_at).slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {canManage && !row.acknowledged ? (
                          <button
                            type="button"
                            disabled={acknowledgeMutation.isPending}
                            onClick={() => acknowledgeMutation.mutate(row.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-2.5 py-1 text-[11.5px] font-semibold text-[#2e7d4f]"
                          >
                            <Icon name="fa-solid fa-check" className="text-[10px]" />
                            تمت المعالجة
                          </button>
                        ) : row.acknowledged ? (
                          <StatusBadge status="done" />
                        ) : null}
                      </td>
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
