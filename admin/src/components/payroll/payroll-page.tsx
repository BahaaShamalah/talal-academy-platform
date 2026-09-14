'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  formatKwd,
  qs,
  type Paginated,
  type PayrollRun,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-KW', { month: 'long', year: 'numeric' });
}

export function PayrollPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('payroll.manage'));
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const runsQuery = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () =>
      apiClient<Paginated<PayrollRun>>(
        `/payroll-runs${qs({ include: 'items', per_page: 50 })}`,
      ),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiClient<PayrollRun>('/payroll-runs', {
        method: 'POST',
        body: JSON.stringify({ period_month: `${period}-01` }),
      }),
    onSuccess: (run) => {
      toast.success('تم توليد تشغيلة الرواتب');
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      router.push(`/dashboard/payroll/${run.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const runs = runsQuery.data?.data ?? [];
  const loading = runsQuery.isLoading;
  const isEmpty = !loading && runs.length === 0;

  return (
    <>
      <AdminHeader title="الرواتب" crumb="المالية ← الرواتب" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">{runs.length} تشغيلة</div>
            {canManage ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> توليد تشغيلة جديدة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={5} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-money-check-dollar"
              title="لا توجد تشغيلات"
              body="ولّد تشغيلة رواتب لشهر معيّن لبدء الحساب."
              primary={
                canManage
                  ? { label: 'توليد تشغيلة جديدة', onClick: () => setModalOpen(true) }
                  : undefined
              }
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الشهر', 'الحالة', 'عدد المعلمين', 'الإجمالي', ''].map((c, i) => (
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
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">
                        {monthLabel(run.period_month)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {run.items?.length ?? '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy">
                        {run.grand_total != null ? formatKwd(run.grand_total) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/payroll/${run.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3 py-1.5 text-[12px] font-bold text-navy"
                          >
                            <Icon name="fa-solid fa-eye" className="text-[11px]" />
                            التفاصيل
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!generateMutation.isPending) setModalOpen(false);
        }}
        title="توليد تشغيلة جديدة"
        eyebrow="PAYROLL"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={generateMutation.isPending || !period}
              onClick={() => generateMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {generateMutation.isPending ? 'جاري التوليد…' : 'توليد'}
            </button>
          </>
        }
      >
        <div>
          <label className={formLabelClass}>الشهر</label>
          <input
            type="month"
            className={`${formFieldClass} font-latin`}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </FormModal>
    </>
  );
}
