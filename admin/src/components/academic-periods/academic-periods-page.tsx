'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  type AcademicPeriod,
  type AcademicPeriodStatus,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name: string;
  start_date: string;
  end_date: string;
  registration_opens_at: string;
  registration_closes_at: string;
};

const emptyForm: FormState = {
  name: '',
  start_date: '',
  end_date: '',
  registration_opens_at: '',
  registration_closes_at: '',
};

const STATUS_BADGE: Record<AcademicPeriodStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: 'مسودة', bg: '#f0ece4', fg: '#6b6560' },
  registration_open: { label: 'مفتوح للتسجيل', bg: '#eaf0f8', fg: '#1c4b8f' },
  active: { label: 'نشط', bg: '#e9f3ec', fg: '#2e7d4f' },
  closed: { label: 'مغلق', bg: '#fff0e4', fg: '#c45e12' },
  archived: { label: 'مؤرشف', bg: '#e8e6e3', fg: '#3d3a36' },
};

type NextAction =
  | { kind: 'transition'; status: AcademicPeriodStatus; label: string }
  | { kind: 'activate'; label: string };

function nextAction(status: AcademicPeriodStatus): NextAction | null {
  switch (status) {
    case 'draft':
      return { kind: 'transition', status: 'registration_open', label: 'افتح للتسجيل' };
    case 'registration_open':
      return { kind: 'activate', label: 'فعّل الفترة' };
    case 'active':
      return { kind: 'transition', status: 'closed', label: 'أغلق الفترة' };
    case 'closed':
      return { kind: 'transition', status: 'archived', label: 'أرشف' };
    default:
      return null;
  }
}

function PeriodBadge({ status }: { status: AcademicPeriodStatus }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function AcademicPeriodsPage() {
  const canView = useAuthStore((s) => s.hasPermission('periods.view'));
  const canManage = useAuthStore((s) => s.hasPermission('periods.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicPeriod | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AcademicPeriod | null>(null);
  const [activateTarget, setActivateTarget] = useState<AcademicPeriod | null>(null);

  const query = useQuery({
    queryKey: ['academic-periods'],
    queryFn: () =>
      apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const periods = query.data?.data ?? [];
  const activePeriod = periods.find((p) => p.status === 'active');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        registration_opens_at: form.registration_opens_at || null,
        registration_closes_at: form.registration_closes_at || null,
      };
      if (editing) {
        return apiClient(`/academic-periods/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/academic-periods', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الفترة' : 'تم إضافة الفترة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['academic-periods'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/academic-periods/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الفترة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['academic-periods'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AcademicPeriodStatus }) =>
      apiClient(`/academic-periods/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث حالة الفترة');
      qc.invalidateQueries({ queryKey: ['academic-periods'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient(`/academic-periods/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('تم تفعيل الفترة، وأُغلقت الفترة النشطة السابقة إن وُجدت');
      setActivateTarget(null);
      qc.invalidateQueries({ queryKey: ['academic-periods'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(period: AcademicPeriod) {
    setEditing(period);
    setForm({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      registration_opens_at: period.registration_opens_at ?? '',
      registration_closes_at: period.registration_closes_at ?? '',
    });
    setModalOpen(true);
  }

  function runNext(period: AcademicPeriod) {
    const action = nextAction(period.status);
    if (!action) return;

    if (action.kind === 'activate') {
      if (activePeriod && activePeriod.id !== period.id) {
        setActivateTarget(period);
        return;
      }
      activateMutation.mutate(period.id);
      return;
    }

    transitionMutation.mutate({ id: period.id, status: action.status });
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="الفترات الدراسية" crumb="الإعدادات ← الفترات الدراسية" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-calendar"
            title="لا صلاحية"
            body="ليس لديك صلاحية عرض الفترات الدراسية."
          />
        </AdminContent>
      </>
    );
  }

  const loading = query.isLoading;
  const isEmpty = !loading && periods.length === 0;
  const busy = transitionMutation.isPending || activateMutation.isPending;

  return (
    <>
      <AdminHeader title="الفترات الدراسية" crumb="الإعدادات ← الفترات الدراسية" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          {activePeriod ? (
            <div className="border-b border-[#f0ece1] bg-[#e9f3ec] px-3.5 py-2.5 text-[13px] text-[#2e7d4f]">
              الفترة النشطة حاليًا: {activePeriod.name} — الباقات والشعب الجديدة تُربط بها تلقائيًا
            </div>
          ) : (
            <div className="border-b border-[#f0ece1] bg-[#f8ecec] px-3.5 py-2.5 text-[13px] text-[#a34b4b]">
              لا توجد فترة نشطة. فعّل فترة قبل إنشاء باقات أو شعب جديدة.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-soft">إدارة دورة حياة الفترات الدراسية</p>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[12.5px] font-bold text-gold"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة فترة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={5} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-calendar"
              title="لا توجد فترات"
              body="أضف فترة دراسية ثم فعّلها لربط الباقات والشعب."
              primary={canManage ? { label: 'إضافة فترة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'البداية', 'النهاية', 'الحالة', ...(canManage ? [''] : [])].map(
                      (c, i) => (
                        <th
                          key={`${c}-${i}`}
                          className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const action = nextAction(period.status);
                    return (
                      <tr key={period.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{period.name}</td>
                        <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                          {period.start_date}
                        </td>
                        <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                          {period.end_date}
                        </td>
                        <td className="px-4 py-3">
                          <PeriodBadge status={period.status} />
                        </td>
                        {canManage ? (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {action ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => runNext(period)}
                                  className="rounded-full border border-cream-line px-2.5 py-1 text-[11.5px] font-bold text-navy hover:bg-cream-soft"
                                >
                                  {action.label}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openEdit(period)}
                                className="rounded-full border border-cream-line px-2.5 py-1 text-[11.5px] font-bold text-ink-soft"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(period)}
                                className="rounded-full border border-[#f0d4d4] px-2.5 py-1 text-[11.5px] font-bold text-[#a34b4b]"
                              >
                                حذف
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
        title={editing ? 'تعديل فترة' : 'إضافة فترة'}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={saveMutation.isPending}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error('اسم الفترة مطلوب');
                  return;
                }
                if (!form.start_date || !form.end_date) {
                  toast.error('تاريخ البداية والنهاية مطلوبان');
                  return;
                }
                saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : editing ? 'حفظ' : 'إضافة'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الفصل الأول 2026"
            />
          </div>
          <div>
            <label className={formLabelClass}>من تاريخ</label>
            <input
              type="date"
              className={formFieldClass}
              dir="ltr"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>إلى تاريخ</label>
            <input
              type="date"
              className={formFieldClass}
              dir="ltr"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              فتح التسجيل <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <input
              type="date"
              className={formFieldClass}
              dir="ltr"
              value={form.registration_opens_at}
              onChange={(e) => setForm((f) => ({ ...f, registration_opens_at: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              إغلاق التسجيل <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <input
              type="date"
              className={formFieldClass}
              dir="ltr"
              value={form.registration_closes_at}
              onChange={(e) => setForm((f) => ({ ...f, registration_closes_at: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        title="حذف الفترة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(activateTarget)}
        onClose={() => {
          if (!activateMutation.isPending) setActivateTarget(null);
        }}
        title="تفعيل الفترة؟"
        body={
          activePeriod
            ? `سيتم إغلاق الفترة النشطة الحالية («${activePeriod.name}») تلقائيًا عند تفعيل «${activateTarget?.name ?? ''}».`
            : `سيتم تفعيل «${activateTarget?.name ?? ''}».`
        }
        confirmLabel="تفعيل"
        loading={activateMutation.isPending}
        onConfirm={() => {
          if (activateTarget) activateMutation.mutate(activateTarget.id);
        }}
      />
    </>
  );
}
