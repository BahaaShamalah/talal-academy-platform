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
import { apiClient, qs, type Branch, type Paginated } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const KUWAIT_CITIES = [
  'مدينة الكويت',
  'حولي',
  'السالمية',
  'الجهراء',
  'الفروانية',
  'الأحمدي',
  'مبارك الكبير',
  'الفحيحيل',
  'الجابرية',
  'بيان',
  'سلوى',
  'الشامية',
];

type FormState = {
  name: string;
  country: string;
  city: string;
  address: string;
  phone_1: string;
  phone_2: string;
  is_main: boolean;
};

const emptyForm: FormState = {
  name: '',
  country: 'الكويت',
  city: '',
  address: '',
  phone_1: '',
  phone_2: '',
  is_main: false,
};

export function BranchesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('branches.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient<Paginated<Branch>>(`/branches${qs({ per_page: 100 })}`),
  });

  const branches = branchesQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        country: form.country.trim() || 'الكويت',
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        phone_1: form.phone_1.trim() || null,
        phone_2: form.phone_2.trim() || null,
        is_main: form.is_main,
      };
      if (editing) {
        return apiClient(`/branches/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/branches', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الفرع بنجاح' : 'تم إضافة الفرع بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/branches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الفرع');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      country: branch.country || 'الكويت',
      city: branch.city ?? '',
      address: branch.address ?? '',
      phone_1: branch.phone_1 ?? '',
      phone_2: branch.phone_2 ?? '',
      is_main: Boolean(branch.is_main),
    });
    setModalOpen(true);
  }

  const loading = branchesQuery.isLoading;
  const isEmpty = !loading && branches.length === 0;

  return (
    <>
      <AdminHeader title="الفروع" crumb="الهيكل الأكاديمي ← الفروع" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">فروع المعهد في الكويت والقاعات التابعة لكل فرع</div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة فرع
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={7} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-building"
              title="لا توجد فروع"
              body="أضف فروع المعهد أولًا ثم اربط بها القاعات والشعب."
              primary={canManage ? { label: 'إضافة فرع', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'اسم الفرع',
                      'الدولة',
                      'المدينة',
                      'العنوان',
                      'الهاتف 1',
                      'الهاتف 2',
                      'عدد القاعات',
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
                  {branches.map((branch) => (
                    <tr key={branch.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-bold text-ink">{branch.name}</span>
                          {branch.is_main ? (
                            <span className="rounded-full bg-[#eaf0f8] px-2 py-0.5 text-[10.5px] font-bold text-[#1c4b8f]">
                              فرع رئيسي
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {branch.country || 'الكويت'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {branch.city || '—'}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-[13px] text-ink-soft">
                        <span className="line-clamp-2">{branch.address || '—'}</span>
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {branch.phone_1 || '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {branch.phone_2 || '—'}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {branch.halls_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(branch)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(branch)}
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
        title={editing ? 'تعديل فرع' : 'إضافة فرع'}
        eyebrow="BRANCH"
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
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error('اسم الفرع مطلوب');
                  return;
                }
                saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>اسم الفرع</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: فرع السالمية"
            />
          </div>

          <div>
            <label className={formLabelClass}>الدولة</label>
            <input className={formFieldClass} value={form.country} readOnly />
          </div>

          <div>
            <label className={formLabelClass}>المدينة</label>
            <select
              className={formFieldClass}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">اختر المدينة</option>
              {KUWAIT_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              {form.city && !KUWAIT_CITIES.includes(form.city) ? (
                <option value={form.city}>{form.city}</option>
              ) : null}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={formLabelClass}>
              العنوان <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <input
              className={formFieldClass}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="الشارع، المنطقة، رقم المبنى…"
            />
          </div>

          <div>
            <label className={formLabelClass}>الهاتف 1</label>
            <input
              className={`${formFieldClass} font-latin`}
              value={form.phone_1}
              onChange={(e) => setForm((f) => ({ ...f, phone_1: e.target.value }))}
              placeholder="22200000"
            />
          </div>

          <div>
            <label className={formLabelClass}>الهاتف 2</label>
            <input
              className={`${formFieldClass} font-latin`}
              value={form.phone_2}
              onChange={(e) => setForm((f) => ({ ...f, phone_2: e.target.value }))}
              placeholder="22200001"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-cream-line2 bg-white px-3.5 py-3 text-[13.5px] text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-gold"
                checked={form.is_main}
                onChange={(e) => setForm((f) => ({ ...f, is_main: e.target.checked }))}
              />
              <span>
                فرع رئيسي
                <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                  عند التفعيل يُلغى تعيين الفرع الرئيسي السابق تلقائيًا.
                </span>
              </span>
            </label>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الفرع؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كان مرتبطًا بقاعات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
