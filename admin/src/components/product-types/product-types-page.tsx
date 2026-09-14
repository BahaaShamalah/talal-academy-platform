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
  type Paginated,
  type ProductType,
  type SubjectSelectionMode,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name_ar: string;
  name_en: string;
  description: string;
  subject_selection_mode: SubjectSelectionMode;
  requires_grade: boolean;
  is_schedulable: boolean;
  is_active: boolean;
};

const emptyForm: FormState = {
  name_ar: '',
  name_en: '',
  description: '',
  subject_selection_mode: 'all_subjects',
  requires_grade: true,
  is_schedulable: true,
  is_active: true,
};

const MODE_OPTIONS: {
  value: SubjectSelectionMode;
  label: string;
  hint: string;
  badgeBg: string;
  badgeFg: string;
}[] = [
  {
    value: 'all_subjects',
    label: 'شاملة',
    hint: 'تشمل كل مواد الصف تلقائيًا',
    badgeBg: '#eaf0f8',
    badgeFg: '#1c4b8f',
  },
  {
    value: 'single_subject',
    label: 'مادة واحدة',
    hint: 'الإدارة تحدد مادة واحدة عند إنشاء الباقة',
    badgeBg: '#f7f0e1',
    badgeFg: '#8a6a20',
  },
  {
    value: 'choose_subjects',
    label: 'اختيار مواد',
    hint: 'ولي الأمر يختار عددًا محددًا من المواد عند الاشتراك',
    badgeBg: '#f0eef4',
    badgeFg: '#5c4a7a',
  },
  {
    value: 'none',
    label: 'بدون',
    hint: 'لا يرتبط بمواد (حصة خاصة أو باقة غير أكاديمية)',
    badgeBg: '#f0ece4',
    badgeFg: '#6b6560',
  },
];

function modeMeta(mode: SubjectSelectionMode) {
  return MODE_OPTIONS.find((m) => m.value === mode) ?? MODE_OPTIONS[0];
}

function softBadge(label: string, bg: string, fg: string) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function ProductTypesPage({
  embedded,
  onNavigateToPlans,
}: {
  embedded?: boolean;
  onNavigateToPlans?: (productTypeId: string) => void;
} = {}) {
  const canView = useAuthStore((s) => s.hasPermission('product-types.view'));
  const canManage = useAuthStore((s) => s.hasPermission('product-types.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);

  const query = useQuery({
    queryKey: ['product-types'],
    queryFn: () =>
      apiClient<Paginated<ProductType>>(`/product-types${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
        subject_selection_mode: form.subject_selection_mode,
        requires_grade: form.requires_grade,
        is_schedulable: form.is_schedulable,
        is_active: form.is_active,
      };
      if (editing) {
        return apiClient(`/product-types/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/product-types', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث النوع' : 'تم إضافة النوع');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['product-types'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/product-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف النوع');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['product-types'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (row: ProductType) =>
      apiClient(`/product-types/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !row.is_active }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث الحالة');
      qc.invalidateQueries({ queryKey: ['product-types'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row: ProductType) {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en ?? '',
      description: row.description ?? '',
      subject_selection_mode: row.subject_selection_mode,
      requires_grade: row.requires_grade,
      is_schedulable: row.is_schedulable,
      is_active: row.is_active,
    });
    setModalOpen(true);
  }

  if (!canView) {
    if (embedded) {
      return (
        <EmptyState
          icon="fa-solid fa-layer-group"
          title="لا صلاحية"
          body="ليس لديك صلاحية عرض أنواع الباقات."
        />
      );
    }
    return (
      <>
        <AdminHeader title="أنواع الباقات" crumb="التسعير ← أنواع الباقات" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-layer-group"
            title="لا صلاحية"
            body="ليس لديك صلاحية عرض أنواع الباقات."
          />
        </AdminContent>
      </>
    );
  }

  const loading = query.isLoading;
  const isEmpty = !loading && rows.length === 0;

  const panel = (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-soft">تعريف أنماط الباقات الأكاديمية القابلة للبيع</p>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[12.5px] font-bold text-gold"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة نوع
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={6} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-layer-group"
              title="لا توجد أنواع"
              body="أضف أنواع الباقات لتستخدمها عند إنشاء الباقات."
              primary={canManage ? { label: 'إضافة نوع', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'نمط اختيار المواد', 'يحتاج صف؟', 'قابل للجدولة؟', 'الحالة', ...(canManage || onNavigateToPlans ? [''] : [])].map(
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
                  {rows.map((row) => {
                    const mode = modeMeta(row.subject_selection_mode);
                    return (
                      <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="px-4 py-3">
                          <div className="text-[13.5px] font-bold text-ink">{row.name_ar}</div>
                          {row.name_en ? (
                            <div className="font-latin mt-0.5 text-[11.5px] text-ink-faint" dir="ltr">
                              {row.name_en}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{softBadge(mode.label, mode.badgeBg, mode.badgeFg)}</td>
                        <td className="px-4 py-3 text-[14px] font-bold text-ink-soft">
                          {row.requires_grade ? '✓' : '✗'}
                        </td>
                        <td className="px-4 py-3 text-[14px] font-bold text-ink-soft">
                          {row.is_schedulable ? '✓' : '✗'}
                        </td>
                        <td className="px-4 py-3">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => toggleActiveMutation.mutate(row)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                row.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'
                              }`}
                              aria-label="تبديل الحالة"
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                  row.is_active ? 'left-0.5' : 'left-[22px]'
                                }`}
                              />
                            </button>
                          ) : row.is_active ? (
                            softBadge('نشط', '#e9f3ec', '#2e7d4f')
                          ) : (
                            softBadge('متوقف', '#f0eef4', '#5c4a7a')
                          )}
                        </td>
                        {canManage || onNavigateToPlans ? (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              {onNavigateToPlans ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToPlans(String(row.id))}
                                  className="rounded-full border border-[#dce8f0] bg-[#f4f9fc] px-2.5 py-1 text-[11.5px] font-bold text-navy"
                                >
                                  الباقات
                                </button>
                              ) : null}
                              {canManage ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(row)}
                                    className="rounded-full border border-cream-line px-2.5 py-1 text-[11.5px] font-bold text-ink-soft"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(row)}
                                    className="rounded-full border border-[#f0d4d4] px-2.5 py-1 text-[11.5px] font-bold text-[#a34b4b]"
                                  >
                                    حذف
                                  </button>
                                </>
                              ) : null}
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
  );

  return (
    <>
      {embedded ? panel : (
        <>
          <AdminHeader title="أنواع الباقات" crumb="التسعير ← أنواع الباقات" />
          <AdminContent>{panel}</AdminContent>
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل نوع باقة' : 'إضافة نوع باقة'}
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
                if (!form.name_ar.trim()) {
                  toast.error('الاسم العربي مطلوب');
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
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>الاسم (عربي)</label>
            <input
              className={formFieldClass}
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="مثال: باقة شاملة"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              الاسم (إنجليزي) <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <input
              className={formFieldClass}
              dir="ltr"
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              placeholder="Full Bundle"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass}>
              الوصف <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <textarea
              rows={2}
              className={`${formFieldClass} resize-y leading-[1.7]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <span className={formLabelClass}>نمط اختيار المواد</span>
            <div className="mt-1 space-y-2">
              {MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 ${
                    form.subject_selection_mode === opt.value
                      ? 'border-gold bg-[#fff8e8]'
                      : 'border-cream-line'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1 accent-gold"
                    checked={form.subject_selection_mode === opt.value}
                    onChange={() => setForm((f) => ({ ...f, subject_selection_mode: opt.value }))}
                  />
                  <span>
                    <span className="block text-[13.5px] font-bold text-ink">{opt.label}</span>
                    <span className="text-[12px] text-ink-soft">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-gold"
                checked={form.requires_grade}
                onChange={(e) => setForm((f) => ({ ...f, requires_grade: e.target.checked }))}
              />
              يتطلب تحديد صف
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-gold"
                checked={form.is_schedulable}
                onChange={(e) => setForm((f) => ({ ...f, is_schedulable: e.target.checked }))}
              />
              قابل للجدولة (شعب وحضور)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-gold"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              نشط
            </label>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        title="حذف النوع؟"
        body={`سيتم حذف «${deleteTarget?.name_ar ?? ''}». لا يمكن حذف نوع مرتبط بباقات.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
