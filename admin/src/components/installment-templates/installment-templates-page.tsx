'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  qs,
  type InstallmentTemplate,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type InstallmentRow = { percentage: string; dueDays: string };

type FormState = {
  name: string;
  count: string;
  rows: InstallmentRow[];
};

function defaultRows(count: number): InstallmentRow[] {
  const base = Math.floor((100 / count) * 100) / 100;
  const rows: InstallmentRow[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const pct = i === count - 1 ? Number((100 - allocated).toFixed(2)) : base;
    allocated += pct;
    rows.push({
      percentage: String(pct),
      dueDays: String(i === 0 ? 0 : i * 30),
    });
  }
  return rows;
}

function emptyForm(): FormState {
  return { name: '', count: '2', rows: defaultRows(2) };
}

function formatPercentages(pcts: number[]) {
  return pcts.map((p) => `${p}%`).join(' — ');
}

function formatDueDays(days: number[]) {
  return days.map((d) => `يوم ${d}`).join(' — ');
}

export function InstallmentTemplatesPage() {
  const canView = useAuthStore((s) => s.hasPermission('installments.view'));
  const canManage = useAuthStore((s) => s.hasPermission('installments.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<InstallmentTemplate | null>(null);

  const query = useQuery({
    queryKey: ['installment-templates'],
    queryFn: () =>
      apiClient<Paginated<InstallmentTemplate>>(
        `/installment-templates${qs({ per_page: 100 })}`,
      ),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  const percentageSum = useMemo(
    () =>
      form.rows.reduce((acc, row) => {
        const n = parseFloat(row.percentage);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [form.rows],
  );

  const sumIsValid = Math.abs(percentageSum - 100) < 0.0001;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const count = Number(form.count);
      const payload = {
        name: form.name.trim(),
        number_of_installments: count,
        split_percentages: form.rows.map((r) => parseFloat(r.percentage)),
        due_offset_days: form.rows.map((r) => parseInt(r.dueDays, 10)),
      };
      if (editing) {
        return apiClient(`/installment-templates/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/installment-templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث خطة التقسيط' : 'تم إضافة خطة التقسيط');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['installment-templates'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient(`/installment-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف خطة التقسيط');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['installment-templates'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function setCount(raw: string) {
    const n = Math.min(24, Math.max(2, parseInt(raw, 10) || 2));
    setForm((f) => {
      const nextRows = [...f.rows];
      while (nextRows.length < n) {
        nextRows.push({ percentage: '', dueDays: String(nextRows.length * 30) });
      }
      while (nextRows.length > n) nextRows.pop();
      return { ...f, count: String(n), rows: nextRows };
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(row: InstallmentTemplate) {
    setEditing(row);
    setForm({
      name: row.name,
      count: String(row.number_of_installments),
      rows: row.split_percentages.map((pct, i) => ({
        percentage: String(pct),
        dueDays: String(row.due_offset_days[i] ?? 0),
      })),
    });
    setModalOpen(true);
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="خطط التقسيط" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const loading = query.isLoading;
  const isEmpty = !loading && rows.length === 0;

  return (
    <>
      <AdminHeader title="خطط التقسيط" crumb="الإعدادات ← خطط التقسيط" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              خطط جاهزة تُربط بالباقات — ولي الأمر يختار التقسيط عند الاشتراك فقط.
            </p>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة خطة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={6} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-calendar-week"
              title="لا توجد خطط تقسيط"
              body="أنشئ خطة بتحديد عدد الدفعات ونسبها ومواعيد الاستحقاق."
              primary={canManage ? { label: 'إضافة خطة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الاسم',
                      'عدد الدفعات',
                      'النسب',
                      'مواعيد الاستحقاق',
                      'الباقات المرتبطة',
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
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{row.name}</td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {row.number_of_installments}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">
                        {formatPercentages(row.split_percentages)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">
                        {formatDueDays(row.due_offset_days)}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {row.plans_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(row)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(row)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                            >
                              <Icon name="fa-solid fa-trash" className="text-[11px]" />
                            </button>
                          </div>
                        </td>
                      ) : null}
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
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل خطة تقسيط' : 'إضافة خطة تقسيط'}
        eyebrow="INSTALLMENTS"
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
              disabled={saveMutation.isPending || !sumIsValid}
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error('أدخل اسم الخطة');
                  return;
                }
                if (!sumIsValid) {
                  toast.error('مجموع النسب يجب أن يساوي 100%');
                  return;
                }
                saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-50"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder='مثال: دفعتين 50/50'
            />
          </div>
          <div>
            <label className={formLabelClass}>عدد الدفعات</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              type="number"
              min={2}
              max={24}
              value={form.count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="space-y-2.5">
            <label className={formLabelClass}>تفاصيل الدفعات</label>
            {form.rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-xl border border-cream-line2 bg-cream-soft/30 p-3 sm:grid-cols-[auto_1fr_1fr]"
              >
                <span className="pt-2 text-[13px] font-bold text-navy">دفعة {index + 1}</span>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-dim">النسبة %</label>
                  <input
                    className={`${formFieldClass} font-latin`}
                    dir="ltr"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.percentage}
                    onChange={(e) =>
                      setForm((f) => {
                        const rows = [...f.rows];
                        rows[index] = { ...rows[index], percentage: e.target.value };
                        return { ...f, rows };
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-dim">
                    أيام الاستحقاق من تاريخ الاشتراك
                  </label>
                  <input
                    className={`${formFieldClass} font-latin`}
                    dir="ltr"
                    type="number"
                    min={0}
                    value={row.dueDays}
                    onChange={(e) =>
                      setForm((f) => {
                        const rows = [...f.rows];
                        rows[index] = { ...rows[index], dueDays: e.target.value };
                        return { ...f, rows };
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <p
            className={`text-[13.5px] font-bold ${sumIsValid ? 'text-[#2e7d4f]' : 'text-[#a34b4b]'}`}
          >
            مجموع النسب: {percentageSum.toFixed(2)}%
            {!sumIsValid ? ' — يجب أن يساوي 100% بالضبط' : ''}
          </p>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف خطة التقسيط؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كانت مرتبطة بباقات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
