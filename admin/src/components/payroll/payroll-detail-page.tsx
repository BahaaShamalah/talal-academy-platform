'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  formatKwd,
  type PayrollItem,
  type PayrollRun,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-KW', { month: 'long', year: 'numeric' });
}

type EditForm = {
  base_amount: string;
  deductions: string;
  bonus: string;
  notes: string;
};

export function PayrollDetailPage({ runId }: { runId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('payroll.manage'));

  const [editing, setEditing] = useState<PayrollItem | null>(null);
  const [form, setForm] = useState<EditForm>({
    base_amount: '',
    deductions: '0',
    bonus: '0',
    notes: '',
  });
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const runQuery = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: () =>
      apiClient<PayrollRun>(`/payroll-runs/${runId}?include=items.teacher`),
  });

  const run = runQuery.data;
  const items = run?.items ?? [];
  const isFinalized = run?.status === 'finalized';

  const pendingManualCount = useMemo(
    () =>
      items.filter(
        (i) => i.compensation_type === 'manual' && (i.base_amount == null || i.base_amount === ''),
      ).length,
    [items],
  );

  const previewNet = useMemo(() => {
    const base =
      form.base_amount === '' || form.base_amount == null
        ? null
        : Number(form.base_amount);
    if (base == null || Number.isNaN(base)) return null;
    const deductions = Number(form.deductions || 0);
    const bonus = Number(form.bonus || 0);
    return Math.round((base + bonus - deductions) * 1000) / 1000;
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('لا بند محدد');
      const payload: Record<string, unknown> = {
        deductions: Number(form.deductions || 0),
        bonus: Number(form.bonus || 0),
        notes: form.notes.trim() || null,
      };
      if (editing.compensation_type === 'manual') {
        payload.base_amount = Number(form.base_amount);
      }
      return apiClient(`/payroll-runs/${runId}/items/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('تم تحديث البند');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      apiClient(`/payroll-runs/${runId}/finalize`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('تم تقفيل التشغيلة');
      setFinalizeOpen(false);
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openEdit(item: PayrollItem) {
    setEditing(item);
    setForm({
      base_amount: item.base_amount != null ? String(item.base_amount) : '',
      deductions: String(item.deductions ?? 0),
      bonus: String(item.bonus ?? 0),
      notes: item.notes ?? '',
    });
  }

  function canSaveEdit() {
    if (isFinalized) return false;
    if (editing?.compensation_type === 'manual') {
      return form.base_amount !== '' && !Number.isNaN(Number(form.base_amount));
    }
    return true;
  }

  if (runQuery.isLoading) {
    return (
      <>
        <AdminHeader title="تفاصيل الرواتب" crumb="جاري التحميل…" />
        <AdminContent className="text-[13px] text-ink-dim">جاري التحميل…</AdminContent>
      </>
    );
  }

  if (runQuery.isError || !run) {
    return (
      <>
        <AdminHeader title="تفاصيل الرواتب" crumb="غير موجودة" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-money-check-dollar"
            title="التشغيلة غير موجودة"
            body="تعذر العثور على هذه التشغيلة."
            primary={{ label: 'العودة', onClick: () => router.push('/dashboard/payroll') }}
          />
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title={monthLabel(run.period_month)} crumb="الرواتب ← التفاصيل" />

      <AdminContent className="space-y-4">
        <Link
          href="/dashboard/payroll"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
        >
          <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
          العودة للقائمة
        </Link>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11.5px] font-bold tracking-wide text-gold">PAYROLL RUN</div>
              <h1 className="mt-1 font-display text-[22px] font-bold text-navy-800">
                {monthLabel(run.period_month)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={run.status} />
                <span className="font-latin text-[14px] font-bold text-navy">
                  الإجمالي: {formatKwd(run.grand_total ?? 0)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/proxy/payroll-runs/${run.id}/pdf`}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[12.5px] font-bold text-navy"
              >
                <Icon name="fa-solid fa-file-pdf" className="text-[12px]" />
                تنزيل تقرير PDF
              </a>
              {canManage && !isFinalized ? (
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    disabled={pendingManualCount > 0}
                    onClick={() => setFinalizeOpen(true)}
                    className="rounded-full bg-[#2e7d4f] px-4 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-50"
                  >
                    تقفيل التشغيلة
                  </button>
                  {pendingManualCount > 0 ? (
                    <span className="text-[11.5px] font-semibold text-[#c47a1a]">
                      أكمل إدخال المبالغ اليدوية أولاً ({pendingManualCount} متبقية)
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">بنود المعلمين</h2>
          </div>
          {items.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-user-slash"
              title="لا بنود"
              body="لا يوجد معلمون بإعدادات أجر في هذه التشغيلة."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'المعلم',
                      'النوع',
                      'الحصص',
                      'الأساس',
                      'خصومات',
                      'مكافأة',
                      'الصافي',
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
                  {items.map((item) => {
                    const needsBase =
                      item.compensation_type === 'manual' &&
                      (item.base_amount == null || item.base_amount === '');
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-[#f4f1ea] hover:bg-cream-soft ${
                          needsBase ? 'bg-[#fff8ef]' : ''
                        }`}
                        style={needsBase ? { boxShadow: 'inset 3px 0 0 #c47a1a' } : undefined}
                      >
                        <td className="px-4 py-3 text-[13.5px] font-bold text-ink">
                          {item.teacher?.name ?? '—'}
                          {needsBase ? (
                            <span className="mt-1 block w-fit rounded-full bg-[#f7f0e1] px-2 py-0.5 text-[10.5px] font-bold text-[#c47a1a]">
                              بانتظار الإدخال
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.compensation_type} />
                        </td>
                        <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                          {item.compensation_type === 'per_session'
                            ? (item.sessions_count ?? 0)
                            : '—'}
                        </td>
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-ink">
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
                        {canManage ? (
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-[9px] border border-cream-line bg-white text-ink-soft"
                                aria-label="تعديل"
                              >
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminContent>

      <FormModal
        open={Boolean(editing)}
        onClose={() => {
          if (!saveMutation.isPending) setEditing(null);
        }}
        title="تعديل بند الراتب"
        eyebrow="ITEM"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending || !canSaveEdit()}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        {isFinalized ? (
          <p className="mb-3 rounded-xl border border-[#cfe3d5] bg-[#e9f3ec] px-3.5 py-3 text-[13px] font-semibold text-[#2e7d4f]">
            هذه التشغيلة مقفلة — لا يمكن التعديل.
          </p>
        ) : null}

        <fieldset disabled={isFinalized} className="space-y-3.5 disabled:opacity-70">
          <p className="text-[13px] text-ink-soft">
            المعلم:{' '}
            <span className="font-bold text-ink">{editing?.teacher?.name}</span>
          </p>

          {editing?.compensation_type === 'manual' ? (
            <div>
              <label className={formLabelClass}>المبلغ الأساسي (د.ك)</label>
              <input
                type="number"
                step="0.001"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.base_amount}
                onChange={(e) => setForm((f) => ({ ...f, base_amount: e.target.value }))}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-[#f4f1ea] bg-cream-soft/60 px-3.5 py-3 text-[13px]">
              الأساس:{' '}
              <span className="font-latin font-bold">
                {editing?.base_amount != null ? formatKwd(editing.base_amount) : '—'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>خصومات</label>
              <input
                type="number"
                step="0.001"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.deductions}
                onChange={(e) => setForm((f) => ({ ...f, deductions: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>مكافأة</label>
              <input
                type="number"
                step="0.001"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={formLabelClass}>ملاحظات</label>
            <textarea
              className={`${formFieldClass} min-h-[80px]`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-cream-line2 bg-white px-3.5 py-3 text-[13.5px]">
            معاينة الصافي:{' '}
            <span className="font-latin text-[16px] font-extrabold text-navy">
              {previewNet != null ? formatKwd(previewNet) : '—'}
            </span>
          </div>
        </fieldset>
      </FormModal>

      <ConfirmDialog
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title="تقفيل التشغيلة؟"
        body="لا يمكن التراجع بعد التقفيل. سيتم قفل جميع البنود ومنع التعديل."
        confirmLabel="تقفيل"
        loading={finalizeMutation.isPending}
        onConfirm={() => finalizeMutation.mutate()}
      />
    </>
  );
}
