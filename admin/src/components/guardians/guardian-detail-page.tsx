'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  formatKwd,
  qs,
  type Guardian,
  type GuardianStatement,
  type Paginated,
  type StatementEvent,
  type StatementEventType,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const EVENT_LABELS: Record<StatementEventType, string> = {
  invoice_issued: 'فاتورة',
  payment_received: 'دفعة',
  refund_issued: 'استرداد',
  credit_adjustment: 'تعديل رصيد',
};

const EVENT_BADGE: Record<StatementEventType, { bg: string; fg: string }> = {
  invoice_issued: { bg: '#eef2fb', fg: '#1c4b8f' },
  payment_received: { bg: '#e8f5ee', fg: '#2e7d4f' },
  refund_issued: { bg: '#f3ecff', fg: '#6b4fa0' },
  credit_adjustment: { bg: '#f7f0e1', fg: '#8a6a20' },
};

const th = 'px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim';

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function eventAmountClass(event: StatementEvent) {
  if (event.type === 'invoice_issued') return 'text-[#a34b4b]';
  if (event.type === 'payment_received' || event.type === 'refund_issued') return 'text-[#2e7d4f]';
  const n = Number(event.amount);
  if (n > 0) return 'text-[#2e7d4f]';
  if (n < 0) return 'text-[#a34b4b]';
  return 'text-ink-soft';
}

function EventTypeBadge({ type }: { type: StatementEventType }) {
  const s = EVENT_BADGE[type];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {EVENT_LABELS[type]}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
  warn,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-cream-line bg-white p-4 shadow-[0_10px_24px_-20px_rgba(6,26,58,.5)]">
      <div className="flex items-center justify-between">
        <span
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-[15px]"
          style={{
            background: accent ? `${accent}22` : 'rgba(200,162,74,.14)',
            color: accent ?? '#8a6a20',
          }}
        >
          <Icon name={icon} />
        </span>
      </div>
      <div
        className="font-latin mt-3 text-[28px] font-bold leading-none"
        style={{ color: warn ? '#a34b4b' : '#123163' }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[13px] text-ink-soft">{label}</div>
    </div>
  );
}

export function GuardianDetailPage({ guardianId }: { guardianId: string }) {
  const canView = useAuthStore((s) => s.hasPermission('guardians.view'));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const guardianQuery = useQuery({
    queryKey: ['guardian', guardianId],
    queryFn: () => apiClient<Guardian>(`/guardians/${guardianId}`),
    enabled: canView,
  });

  const statementParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to]);

  const statementQuery = useQuery({
    queryKey: ['guardian-statement', guardianId, statementParams],
    queryFn: () =>
      apiClient<GuardianStatement>(
        `/guardians/${guardianId}/statement${qs(statementParams)}`,
      ),
    enabled: canView,
  });

  const studentsQuery = useQuery({
    queryKey: ['guardian-students', guardianId],
    queryFn: () =>
      apiClient<Paginated<{ id: number; full_name: string; file_number?: string }>>(
        `/students${qs({ 'filter[guardian_id]': guardianId, per_page: 50 })}`,
      ),
    enabled: canView,
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="ولي الأمر" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const guardian = guardianQuery.data;
  const summary = statementQuery.data?.summary;
  const events = statementQuery.data?.events ?? [];
  const students = studentsQuery.data?.data ?? [];
  const outstanding = Number(summary?.total_outstanding ?? 0);

  return (
    <>
      <AdminHeader
        title={guardian?.full_name ?? 'ولي الأمر'}
        crumb={
          <Link href="/dashboard/student-files" className="text-gold-deep hover:underline">
            ملفات الطلاب
          </Link>
        }
      />

      <AdminContent className="flex flex-col gap-4">
        {guardianQuery.isLoading ? (
          <TableSkeleton rows={2} cols={3} />
        ) : guardian ? (
          <section className="rounded-[18px] border border-cream-line bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-[11.5px] text-ink-dim">الاسم</div>
                <div className="text-[15px] font-bold text-navy-800">{guardian.full_name}</div>
              </div>
              <div>
                <div className="text-[11.5px] text-ink-dim">الهاتف</div>
                <div className="font-latin text-[14px]">{guardian.phone}</div>
              </div>
              <div>
                <div className="text-[11.5px] text-ink-dim">صلة القرابة</div>
                <div className="text-[14px]">{guardian.relationship ?? '—'}</div>
              </div>
              <div>
                <div className="text-[11.5px] text-ink-dim">الأبناء المسجّلون</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {students.map((s) => (
                    <Link
                      key={s.id}
                      href={`/dashboard/student-files/${s.id}`}
                      className="rounded-full bg-cream-soft px-2.5 py-1 text-[12px] font-semibold text-navy hover:bg-gold/10"
                    >
                      {s.full_name}
                    </Link>
                  ))}
                  {students.length === 0 && (
                    <span className="text-[13px] text-ink-dim">—</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">كشف الحساب</h2>
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
              {(from || to) && (
                <button
                  type="button"
                  className="rounded-[10px] border border-cream-line px-2.5 py-1.5 text-[12px] text-ink-soft"
                  onClick={() => {
                    setFrom('');
                    setTo('');
                  }}
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {statementQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={3} cols={5} />
            </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 p-4">
                <SummaryCard
                  label="إجمالي الفواتير"
                  value={formatKwd(summary.total_invoiced)}
                  icon="fa-solid fa-file-invoice-dollar"
                  accent="#1c4b8f"
                />
                <SummaryCard
                  label="المدفوع"
                  value={formatKwd(summary.total_paid)}
                  icon="fa-solid fa-circle-check"
                  accent="#2e7d4f"
                />
                <SummaryCard
                  label="المتبقي"
                  value={formatKwd(summary.total_outstanding)}
                  icon="fa-solid fa-clock"
                  accent="#a34b4b"
                  warn={outstanding > 0}
                />
                <SummaryCard
                  label="المسترد"
                  value={formatKwd(summary.total_refunded)}
                  icon="fa-solid fa-rotate-left"
                  accent="#6b4fa0"
                />
                <SummaryCard
                  label="الرصيد الحالي"
                  value={formatKwd(summary.current_credit_balance)}
                  icon="fa-solid fa-wallet"
                  accent="#c8a24a"
                />
              </div>

              <div className="overflow-x-auto border-t border-[#f0ece1]">
                <table className="w-full min-w-[720px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-cream-soft">
                      <th className={th}>التاريخ</th>
                      <th className={th}>النوع</th>
                      <th className={th}>الوصف</th>
                      <th className={th}>الطالب</th>
                      <th className={th}>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <EmptyState
                            icon="fa-solid fa-receipt"
                            title="لا توجد حركات"
                            body="لا توجد أحداث مالية في النطاق المحدد."
                          />
                        </td>
                      </tr>
                    ) : (
                      events.map((event, idx) => (
                        <tr key={`${event.date}-${event.type}-${idx}`} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                          <td className="font-latin px-4 py-3 whitespace-nowrap text-ink-soft">
                            {dateLabel(event.date)}
                          </td>
                          <td className="px-4 py-3">
                            <EventTypeBadge type={event.type} />
                          </td>
                          <td className="max-w-[280px] px-4 py-3 text-ink">{event.description}</td>
                          <td className="px-4 py-3 text-ink-soft">{event.student_name ?? '—'}</td>
                          <td className={`font-latin px-4 py-3 font-bold ${eventAmountClass(event)}`}>
                            {formatKwd(event.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      </AdminContent>
    </>
  );
}
