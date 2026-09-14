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
  formatKwd,
  qs,
  type Coupon,
  type CouponScope,
  type CouponType,
  type Grade,
  type Paginated,
  type Plan,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  code: string;
  type: CouponType;
  value: string;
  scope: CouponScope;
  grade_id: string;
  plan_id: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  min_purchase_amount: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  code: '',
  type: 'percentage',
  value: '',
  scope: 'all',
  grade_id: '',
  plan_id: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
  min_purchase_amount: '',
  is_active: true,
};

function softBadge(label: string, bg: string, fg: string) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function typeLabel(type: CouponType) {
  return type === 'percentage' ? 'نسبة' : 'مبلغ ثابت';
}

function scopeDisplay(coupon: Coupon) {
  if (coupon.scope === 'specific_grade') {
    return `صف محدد${coupon.grade?.name ? ` — ${coupon.grade.name}` : ''}`;
  }
  if (coupon.scope === 'specific_plan') {
    return `باقة محددة${coupon.plan?.name ? ` — ${coupon.plan.name}` : ''}`;
  }
  return 'الكل';
}

function valueLabel(coupon: Coupon) {
  if (coupon.type === 'percentage') return `${Number(coupon.value)}%`;
  return formatKwd(coupon.value);
}

function usageLabel(coupon: Coupon) {
  const used = coupon.used_count ?? 0;
  if (coupon.max_uses == null) return `${used} / غير محدود`;
  return `${used}/${coupon.max_uses}`;
}

function validityLabel(coupon: Coupon) {
  const from = coupon.valid_from;
  const until = coupon.valid_until;
  if (!from && !until) return 'بدون تاريخ انتهاء';
  if (from && until) return `${from} — ${until}`;
  if (from) return `من ${from}`;
  return until ? `إلى ${until}` : 'بدون تاريخ انتهاء';
}

export function CouponsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('coupons.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [activeFilter, setActiveFilter] = useState('');

  const couponsQuery = useQuery({
    queryKey: ['coupons', activeFilter],
    queryFn: () =>
      apiClient<Paginated<Coupon>>(
        `/coupons${qs({
          include: 'grade,plan',
          per_page: 100,
          'filter[is_active]': activeFilter || undefined,
        })}`,
      ),
  });

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () => apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100 })}`),
    enabled: modalOpen,
  });

  const plansQuery = useQuery({
    queryKey: ['plans-options'],
    queryFn: () => apiClient<Paginated<Plan>>(`/plans${qs({ per_page: 100 })}`),
    enabled: modalOpen,
  });

  const coupons = couponsQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        grade_id: form.scope === 'specific_grade' && form.grade_id ? Number(form.grade_id) : null,
        plan_id: form.scope === 'specific_plan' && form.plan_id ? Number(form.plan_id) : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        min_purchase_amount: form.min_purchase_amount ? Number(form.min_purchase_amount) : null,
        is_active: form.is_active,
      };

      if (editing) {
        return apiClient(`/coupons/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/coupons', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الكوبون' : 'تم إنشاء الكوبون');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الكوبون');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (coupon: Coupon) =>
      apiClient(`/coupons/${coupon.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !coupon.is_active }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث حالة الكوبون');
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      scope: coupon.scope,
      grade_id: coupon.grade_id ? String(coupon.grade_id) : '',
      plan_id: coupon.plan_id ? String(coupon.plan_id) : '',
      max_uses: coupon.max_uses != null ? String(coupon.max_uses) : '',
      valid_from: coupon.valid_from ?? '',
      valid_until: coupon.valid_until ?? '',
      min_purchase_amount:
        coupon.min_purchase_amount != null ? String(coupon.min_purchase_amount) : '',
      is_active: coupon.is_active,
    });
    setModalOpen(true);
  }

  function validateForm(): boolean {
    if (!form.code.trim()) {
      toast.error('رمز الكوبون مطلوب');
      return false;
    }
    if (form.value === '' || Number.isNaN(Number(form.value))) {
      toast.error('قيمة الخصم مطلوبة');
      return false;
    }
    if (form.type === 'percentage' && (Number(form.value) < 0 || Number(form.value) > 100)) {
      toast.error('النسبة يجب أن تكون بين 0 و 100');
      return false;
    }
    if (form.scope === 'specific_grade' && !form.grade_id) {
      toast.error('اختر الصف');
      return false;
    }
    if (form.scope === 'specific_plan' && !form.plan_id) {
      toast.error('اختر الباقة');
      return false;
    }
    return true;
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = couponsQuery.isLoading;
  const isEmpty = !loading && coupons.length === 0;

  return (
    <>
      <AdminHeader title="الكوبونات" crumb="المالية ← الكوبونات" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <select
              className={selectCls}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">كل الحالات</option>
              <option value="1">نشط</option>
              <option value="0">متوقف</option>
            </select>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة كوبون
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={7} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-ticket"
              title="لا توجد كوبونات"
              body="أنشئ كوبونات خصم لتطبيقها عند الاشتراك بالباقات."
              primary={canManage ? { label: 'إضافة كوبون', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الكود',
                      'النوع',
                      'القيمة',
                      'النطاق',
                      'الاستخدام',
                      'الصلاحية',
                      'الحالة',
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
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="font-latin px-4 py-3">
                        {softBadge(coupon.code, '#1a365d', '#f7f0e1')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {typeLabel(coupon.type)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-ink">
                        {valueLabel(coupon)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{scopeDisplay(coupon)}</td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {usageLabel(coupon)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-soft">
                        {validityLabel(coupon)}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => toggleActiveMutation.mutate(coupon)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              coupon.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'
                            }`}
                            aria-label="تبديل الحالة"
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                coupon.is_active ? 'left-0.5' : 'left-[22px]'
                              }`}
                            />
                          </button>
                        ) : coupon.is_active ? (
                          softBadge('نشط', '#e9f3ec', '#2e7d4f')
                        ) : (
                          softBadge('متوقف', '#f4f1ea', '#8a8478')
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(coupon)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(coupon)}
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
        wide
        onClose={() => {
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل كوبون' : 'إضافة كوبون'}
        eyebrow="COUPON"
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
                if (validateForm()) saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>رمز الكوبون</label>
            <input
              className={`${formFieldClass} font-latin uppercase`}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME10"
            />
          </div>
          <div>
            <label className={formLabelClass}>النوع</label>
            <select
              className={formFieldClass}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
            >
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              القيمة {form.type === 'percentage' ? '(%)' : '(د.ك)'}
            </label>
            <input
              type="number"
              step="0.001"
              className={`${formFieldClass} font-latin`}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <span className={formLabelClass}>النطاق</span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="radio"
                  className="accent-gold"
                  checked={form.scope === 'all'}
                  onChange={() =>
                    setForm((f) => ({ ...f, scope: 'all', grade_id: '', plan_id: '' }))
                  }
                />
                الكل
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="radio"
                  className="accent-gold"
                  checked={form.scope === 'specific_grade'}
                  onChange={() =>
                    setForm((f) => ({ ...f, scope: 'specific_grade', plan_id: '' }))
                  }
                />
                صف محدد
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="radio"
                  className="accent-gold"
                  checked={form.scope === 'specific_plan'}
                  onChange={() =>
                    setForm((f) => ({ ...f, scope: 'specific_plan', grade_id: '' }))
                  }
                />
                باقة محددة
              </label>
            </div>
          </div>
          {form.scope === 'specific_grade' ? (
            <div className="sm:col-span-2">
              <label className={formLabelClass}>الصف</label>
              <select
                className={formFieldClass}
                value={form.grade_id}
                onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value }))}
              >
                <option value="">اختر الصف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {form.scope === 'specific_plan' ? (
            <div className="sm:col-span-2">
              <label className={formLabelClass}>الباقة</label>
              <select
                className={formFieldClass}
                value={form.plan_id}
                onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
              >
                <option value="">اختر الباقة</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={formLabelClass}>الحد الأقصى للاستخدام</label>
            <input
              type="number"
              min={1}
              className={`${formFieldClass} font-latin`}
              value={form.max_uses}
              onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
              placeholder="فارغ = غير محدود"
            />
          </div>
          <div>
            <label className={formLabelClass}>الحد الأدنى للشراء (د.ك)</label>
            <input
              type="number"
              step="0.001"
              className={`${formFieldClass} font-latin`}
              value={form.min_purchase_amount}
              onChange={(e) => setForm((f) => ({ ...f, min_purchase_amount: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>يبدأ من</label>
            <input
              type="date"
              className={`${formFieldClass} font-latin`}
              value={form.valid_from}
              onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>ينتهي في</label>
            <input
              type="date"
              className={`${formFieldClass} font-latin`}
              value={form.valid_until}
              onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-cream-line2 bg-white px-3.5 py-3 text-[13.5px]">
              <input
                type="checkbox"
                className="accent-gold"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              كوبون نشط
            </label>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الكوبون؟"
        body={`سيتم حذف «${deleteTarget?.code ?? ''}». إذا كان مرتبطًا بفواتير فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
