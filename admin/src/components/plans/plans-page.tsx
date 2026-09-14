'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
  type EducationalStage,
  type Grade,
  type Paginated,
  type Plan,
  type PlanDurationPeriod,
  type PlanDurationType,
  type ProductType,
  type InstallmentTemplate,
  type Subject,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type ScopeMode = 'grade' | 'stage';

type FormState = {
  product_type_id: string;
  name: string;
  description: string;
  scope: ScopeMode;
  grade_id: string;
  educational_stage_id: string;
  subject_id: string;
  subject_selection_count: string;
  duration_type: PlanDurationType;
  duration_period_id: string;
  duration_academic_period_id: string;
  installment_template_id: string;
  price: string;
  compare_at_price: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  product_type_id: '',
  name: '',
  description: '',
  scope: 'stage',
  grade_id: '',
  educational_stage_id: '',
  subject_id: '',
  subject_selection_count: '',
  duration_type: 'fixed_period',
  duration_period_id: '',
  duration_academic_period_id: '',
  installment_template_id: '',
  price: '',
  compare_at_price: '',
  is_active: true,
};

type InstallmentRow = { percentage: string; dueDays: string };
type InstallmentFormState = { name: string; count: string; rows: InstallmentRow[] };

function defaultInstallmentRows(count: number): InstallmentRow[] {
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

function emptyInstallmentForm(): InstallmentFormState {
  return { name: '', count: '2', rows: defaultInstallmentRows(2) };
}

function periodStatusLabel(status?: string) {
  switch (status) {
    case 'active':
      return 'نشطة';
    case 'registration_open':
      return 'فتح التسجيل';
    case 'draft':
      return 'مسودة';
    case 'closed':
      return 'مغلقة';
    case 'archived':
      return 'مؤرشفة';
    default:
      return '';
  }
}

function matchAcademicPeriodId(plan: Plan, periods: AcademicPeriod[]): string {
  if (plan.duration_type !== 'fixed_period') return '';
  const dp = plan.duration_period;
  if (!dp) return '';
  const exact = periods.find(
    (p) => p.name === dp.name && p.start_date === dp.start_date && p.end_date === dp.end_date,
  );
  if (exact) return String(exact.id);
  const byDates = periods.find(
    (p) => p.start_date === dp.start_date && p.end_date === dp.end_date,
  );
  return byDates ? String(byDates.id) : '';
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

export function PlansPage({
  embedded,
  initialTypeFilter = '',
}: {
  embedded?: boolean;
  initialTypeFilter?: string;
} = {}) {
  const canManage = useAuthStore((s) => s.hasPermission('plans.manage'));
  const canManageInstallments = useAuthStore((s) => s.hasPermission('installments.manage'));
  const qc = useQueryClient();

  const [gradeFilter, setGradeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [activeFilter, setActiveFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentTemplate | null>(null);
  const [installmentForm, setInstallmentForm] = useState<InstallmentFormState>(emptyInstallmentForm);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  const gradesQuery = useQuery({
    queryKey: ['grades-with-subjects'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(
        `/grades${qs({ include: 'subjects,educationalStage', per_page: 100 })}`,
      ),
  });

  const stagesQuery = useQuery({
    queryKey: ['educational-stages'],
    queryFn: () =>
      apiClient<Paginated<EducationalStage>>(
        `/educational-stages${qs({ per_page: 100 })}`,
      ),
  });

  const productTypesQuery = useQuery({
    queryKey: ['product-types', 'active'],
    queryFn: () =>
      apiClient<Paginated<ProductType>>(
        `/product-types${qs({ per_page: 100, 'filter[is_active]': 1 })}`,
      ),
  });

  const allProductTypesQuery = useQuery({
    queryKey: ['product-types'],
    queryFn: () =>
      apiClient<Paginated<ProductType>>(`/product-types${qs({ per_page: 100 })}`),
  });

  const periodsQuery = useQuery({
    queryKey: ['academic-periods'],
    queryFn: () =>
      apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
  });

  const durationsQuery = useQuery({
    queryKey: ['plan-durations'],
    queryFn: () =>
      apiClient<Paginated<PlanDurationPeriod>>(`/plan-durations${qs({ per_page: 100 })}`),
    retry: false,
  });

  const templatesQuery = useQuery({
    queryKey: ['installment-templates'],
    queryFn: () =>
      apiClient<Paginated<InstallmentTemplate>>(
        `/installment-templates${qs({ per_page: 100 })}`,
      ),
  });

  const plansQuery = useQuery({
    queryKey: ['plans', gradeFilter, stageFilter, typeFilter, activeFilter],
    queryFn: () =>
      apiClient<Paginated<Plan>>(
        `/plans${qs({
          include: 'grade,educationalStage,subject,period,durationPeriod,productType,installmentTemplate',
          per_page: 100,
          'filter[grade_id]': gradeFilter || undefined,
          'filter[educational_stage_id]': stageFilter || undefined,
          'filter[product_type_id]': typeFilter || undefined,
          'filter[is_active]': activeFilter || undefined,
        })}`,
      ),
  });

  const grades = gradesQuery.data?.data ?? [];
  const stages = stagesQuery.data?.data ?? [];
  const activeProductTypes = productTypesQuery.data?.data ?? [];
  const allProductTypes = allProductTypesQuery.data?.data ?? [];
  const durations = durationsQuery.data?.data ?? [];
  const installmentTemplates = templatesQuery.data?.data ?? [];
  const academicPeriods = periodsQuery.data?.data ?? [];
  const activePeriod = academicPeriods.find((p) => p.status === 'active');
  const durationPeriods = academicPeriods.filter((p) => p.status !== 'archived');
  const plans = plansQuery.data?.data ?? [];

  const selectedType = useMemo(() => {
    const id = Number(form.product_type_id);
    return (
      activeProductTypes.find((t) => t.id === id) ??
      allProductTypes.find((t) => t.id === id) ??
      null
    );
  }, [form.product_type_id, activeProductTypes, allProductTypes]);

  const formGradeSubjects = useMemo(() => {
    const g = grades.find((x) => String(x.id) === form.grade_id);
    return g?.subjects ?? [];
  }, [grades, form.grade_id]);

  const formStageSubjects = useMemo(() => {
    if (!form.educational_stage_id) return [] as Subject[];
    const map = new Map<number, Subject>();
    grades
      .filter((g) => String(g.educational_stage_id) === form.educational_stage_id)
      .forEach((g) => {
        (g.subjects ?? []).forEach((s) => map.set(s.id, s));
      });
    return Array.from(map.values());
  }, [grades, form.educational_stage_id]);

  const subjectOptions = form.scope === 'stage' ? formStageSubjects : formGradeSubjects;

  const stageGradesPreview = useMemo(() => {
    if (!form.educational_stage_id) return [];
    return grades
      .filter((g) => String(g.educational_stage_id) === form.educational_stage_id)
      .map((g) => g.name);
  }, [grades, form.educational_stage_id]);

  const installmentPercentageSum = useMemo(
    () =>
      installmentForm.rows.reduce((acc, row) => {
        const n = parseFloat(row.percentage);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [installmentForm.rows],
  );
  const installmentSumValid = Math.abs(installmentPercentageSum - 100) < 0.0001;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const mode = selectedType?.subject_selection_mode;
      const payload: Record<string, unknown> = {
        product_type_id: Number(form.product_type_id),
        name: form.name.trim(),
        description: form.description.trim() || null,
        grade_id:
          selectedType?.requires_grade && form.scope === 'grade' && form.grade_id
            ? Number(form.grade_id)
            : null,
        educational_stage_id:
          selectedType?.requires_grade && form.scope === 'stage' && form.educational_stage_id
            ? Number(form.educational_stage_id)
            : null,
        subject_id:
          mode === 'single_subject' && form.subject_id ? Number(form.subject_id) : null,
        subject_selection_count:
          mode === 'choose_subjects' && form.subject_selection_count
            ? Number(form.subject_selection_count)
            : null,
        duration_type: form.duration_type,
        duration_period_id:
          form.duration_type === 'fixed_period' && !form.duration_academic_period_id
            ? Number(form.duration_period_id)
            : null,
        duration_academic_period_id:
          form.duration_type === 'fixed_period' && form.duration_academic_period_id
            ? Number(form.duration_academic_period_id)
            : null,
        installment_template_id: form.installment_template_id
          ? Number(form.installment_template_id)
          : null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        is_active: form.is_active,
      };

      if (editing) {
        return apiClient(`/plans/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/plans', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الباقة بنجاح' : 'تم إضافة الباقة بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveInstallmentMutation = useMutation({
    mutationFn: async () => {
      const count = Number(installmentForm.count);
      const payload = {
        name: installmentForm.name.trim(),
        number_of_installments: count,
        split_percentages: installmentForm.rows.map((r) => parseFloat(r.percentage)),
        due_offset_days: installmentForm.rows.map((r) => parseInt(r.dueDays, 10)),
      };
      if (editingInstallment) {
        return apiClient<InstallmentTemplate>(`/installment-templates/${editingInstallment.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient<InstallmentTemplate>('/installment-templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (saved) => {
      toast.success(editingInstallment ? 'تم تحديث خطة التقسيط' : 'تم إضافة خطة التقسيط');
      setInstallmentModalOpen(false);
      setEditingInstallment(null);
      setInstallmentForm(emptyInstallmentForm());
      qc.invalidateQueries({ queryKey: ['installment-templates'] });
      const id = (saved as InstallmentTemplate)?.id;
      if (id) {
        setForm((f) => ({ ...f, installment_template_id: String(id) }));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الباقة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (plan: Plan) =>
      apiClient(`/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !plan.is_active }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث حالة الباقة');
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    if (!activePeriod) {
      toast.error('لا توجد فترة دراسية نشطة حاليًا، فعّل فترة أولاً من صفحة الفترات الدراسية');
      return;
    }
    setEditing(null);
    setForm({
      ...emptyForm,
      scope: stageFilter ? 'stage' : gradeFilter ? 'grade' : 'stage',
      grade_id: gradeFilter,
      educational_stage_id: stageFilter,
      duration_type: 'fixed_period',
      duration_academic_period_id: activePeriod ? String(activePeriod.id) : '',
    });
    setModalOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    const isStage = Boolean(plan.educational_stage_id);
    setForm({
      product_type_id: String(plan.product_type_id),
      name: plan.name,
      description: plan.description ?? '',
      scope: isStage ? 'stage' : 'grade',
      grade_id: plan.grade_id != null ? String(plan.grade_id) : '',
      educational_stage_id:
        plan.educational_stage_id != null ? String(plan.educational_stage_id) : '',
      subject_id: plan.subject_id != null ? String(plan.subject_id) : '',
      subject_selection_count:
        plan.subject_selection_count != null ? String(plan.subject_selection_count) : '',
      duration_type: plan.duration_type,
      duration_period_id:
        plan.duration_period_id != null ? String(plan.duration_period_id) : '',
      duration_academic_period_id: matchAcademicPeriodId(plan, durationPeriods),
      installment_template_id:
        plan.installment_template_id != null ? String(plan.installment_template_id) : '',
      price: String(plan.price ?? ''),
      compare_at_price: plan.compare_at_price != null ? String(plan.compare_at_price) : '',
      is_active: plan.is_active,
    });
    setModalOpen(true);
  }

  function onProductTypeChange(id: string) {
    setForm((f) => ({
      ...f,
      product_type_id: id,
      subject_id: '',
      subject_selection_count: '',
    }));
  }

  function openCreateInstallment() {
    setEditingInstallment(null);
    setInstallmentForm(emptyInstallmentForm());
    setInstallmentModalOpen(true);
  }

  function openEditInstallment() {
    const current = installmentTemplates.find(
      (t) => String(t.id) === form.installment_template_id,
    );
    if (!current) {
      toast.error('اختر خطة تقسيط أولاً لتعديلها');
      return;
    }
    setEditingInstallment(current);
    setInstallmentForm({
      name: current.name,
      count: String(current.number_of_installments),
      rows: current.split_percentages.map((pct, i) => ({
        percentage: String(pct),
        dueDays: String(current.due_offset_days[i] ?? 0),
      })),
    });
    setInstallmentModalOpen(true);
  }

  function setInstallmentCount(raw: string) {
    const n = Math.min(24, Math.max(2, parseInt(raw, 10) || 2));
    setInstallmentForm((f) => {
      const nextRows = [...f.rows];
      while (nextRows.length < n) {
        nextRows.push({ percentage: '', dueDays: String(nextRows.length * 30) });
      }
      while (nextRows.length > n) nextRows.pop();
      return { ...f, count: String(n), rows: nextRows };
    });
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = plansQuery.isLoading;
  const isEmpty = !loading && plans.length === 0;

  const mode = selectedType?.subject_selection_mode;
  const showGrade = Boolean(selectedType?.requires_grade);
  const showSubject = mode === 'single_subject';
  const showCount = mode === 'choose_subjects';

  const panel = (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          {!activePeriod ? (
            <div className="border-b border-[#f0ece1] bg-[#f8ecec] px-3.5 py-2.5 text-[13px] text-[#a34b4b]">
              لا توجد فترة دراسية نشطة حاليًا. فعّل فترة أولاً من صفحة الفترات الدراسية قبل إضافة باقة.
            </div>
          ) : (
            <div className="border-b border-[#f0ece1] bg-[#e9f3ec] px-3.5 py-2.5 text-[13px] text-[#2e7d4f]">
              الباقات الجديدة تُربط تلقائيًا بالفترة النشطة: {activePeriod.name}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <select
                className={selectCls}
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  if (e.target.value) setGradeFilter('');
                }}
              >
                <option value="">كل المراحل</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  if (e.target.value) setStageFilter('');
                }}
              >
                <option value="">كل الصفوف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">كل أنواع الباقات</option>
                {allProductTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_ar}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="">كل الحالات</option>
                <option value="1">نشطة</option>
                <option value="0">غير نشطة</option>
              </select>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة باقة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={8} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-tags"
              title="لا توجد باقات"
              body="أضف باقات مرتبطة بأنواع الباقات للتسجيل والبيع."
              primary={canManage ? { label: 'إضافة باقة', onClick: openCreate } : undefined}
              secondary={{
                label: 'إعادة ضبط الفلاتر',
                onClick: () => {
                  setGradeFilter('');
                  setStageFilter('');
                  setTypeFilter('');
                  setActiveFilter('');
                },
              }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'اسم الباقة',
                      'نوع الباقة',
                      'النطاق',
                      'الفترة',
                      'التفاصيل',
                      'المدة',
                      'السعر',
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
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">{plan.name}</div>
                        {plan.description ? (
                          <div className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-faint">
                            {plan.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-ink-soft">
                        {plan.product_type?.name_ar ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {plan.educational_stage?.name
                          ? `${plan.educational_stage.name} (جميع الصفوف)`
                          : (plan.grade?.name ?? '—')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {plan.period?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {plan.product_type?.subject_selection_mode === 'single_subject'
                          ? softBadge(plan.subject?.name ?? 'مادة', '#f7f0e1', '#8a6a20')
                          : plan.product_type?.subject_selection_mode === 'choose_subjects'
                            ? softBadge(
                                `${plan.subject_selection_count ?? '—'} مواد`,
                                '#f0eef4',
                                '#5c4a7a',
                              )
                            : plan.product_type?.subject_selection_mode === 'all_subjects'
                              ? softBadge('شاملة', '#eaf0f8', '#1c4b8f')
                              : softBadge('بدون مواد', '#f0ece4', '#6b6560')}
                      </td>
                      <td className="px-4 py-3">
                        {plan.duration_type === 'monthly_recurring'
                          ? softBadge('شهري متجدد', '#e9f3ec', '#2e7d4f')
                          : softBadge(
                              plan.duration_period?.name ?? 'مدة محددة',
                              '#f0eef4',
                              '#5c4a7a',
                            )}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-navy-800">
                        {Number(plan.price).toFixed(3)} د.ك
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => toggleActiveMutation.mutate(plan)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              plan.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'
                            }`}
                            aria-label="تبديل الحالة"
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                plan.is_active ? 'left-0.5' : 'left-[22px]'
                              }`}
                            />
                          </button>
                        ) : plan.is_active ? (
                          softBadge('نشطة', '#e9f3ec', '#2e7d4f')
                        ) : (
                          softBadge('غير نشطة', '#f0eef4', '#5c4a7a')
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(plan)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(plan)}
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
  );

  return (
    <>
      {embedded ? panel : (
        <>
          <AdminHeader title="الباقات" crumb="التسعير ← الباقات" />
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
        title={editing ? 'تعديل باقة' : 'إضافة باقة'}
        eyebrow="PLAN"
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
                if (!form.product_type_id || !form.name.trim() || form.price === '') {
                  toast.error('أكمل الحقول المطلوبة');
                  return;
                }
                if (showGrade) {
                  if (form.scope === 'stage' && !form.educational_stage_id) {
                    toast.error('اختر المرحلة');
                    return;
                  }
                  if (form.scope === 'grade' && !form.grade_id) {
                    toast.error('اختر الصف');
                    return;
                  }
                }
                if (showSubject && !form.subject_id) {
                  toast.error('اختر المادة');
                  return;
                }
                if (showCount && (!form.subject_selection_count || Number(form.subject_selection_count) < 1)) {
                  toast.error('حدد عدد المواد المطلوب (≥ 1)');
                  return;
                }
                if (form.duration_type === 'fixed_period' && !form.duration_academic_period_id && !form.duration_period_id) {
                  toast.error('اختر مدة الباقة (الفصل الدراسي)');
                  return;
                }
                if (Number(form.price) < 0) {
                  toast.error('السعر يجب أن يكون صفرًا أو أكبر');
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
            <label className={formLabelClass}>نوع الباقة</label>
            <select
              className={formFieldClass}
              value={form.product_type_id}
              onChange={(e) => onProductTypeChange(e.target.value)}
            >
              <option value="">اختر نوع الباقة</option>
              {activeProductTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name_ar}
                </option>
              ))}
              {editing &&
              selectedType &&
              !activeProductTypes.some((t) => t.id === selectedType.id) ? (
                <option value={selectedType.id}>{selectedType.name_ar} (متوقف)</option>
              ) : null}
            </select>
          </div>

          {form.product_type_id ? (
            <>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>اسم الباقة</label>
                <input
                  className={formFieldClass}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
              <div className="sm:col-span-2 rounded-xl border border-cream-line2 bg-cream-soft px-3.5 py-3 text-[13px] text-ink-dim">
                {editing
                  ? `الفترة المرتبطة بهذه الباقة: ${editing.period?.name ?? '—'}`
                  : `ستُربط هذه الباقة تلقائيًا بالفترة النشطة: ${activePeriod?.name ?? '—'}`}
              </div>

              {showGrade ? (
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <span className={formLabelClass}>نطاق الباقة</span>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-[13px] text-ink">
                        <input
                          type="radio"
                          className="accent-gold"
                          checked={form.scope === 'stage'}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              scope: 'stage',
                              grade_id: '',
                              subject_id: '',
                            }))
                          }
                        />
                        مرحلة كاملة (كل الصفوف)
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-ink">
                        <input
                          type="radio"
                          className="accent-gold"
                          checked={form.scope === 'grade'}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              scope: 'grade',
                              educational_stage_id: '',
                              subject_id: '',
                            }))
                          }
                        />
                        صف محدد
                      </label>
                    </div>
                  </div>

                  {form.scope === 'stage' ? (
                    <div>
                      <label className={formLabelClass}>المرحلة</label>
                      <select
                        className={formFieldClass}
                        value={form.educational_stage_id}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            educational_stage_id: e.target.value,
                            subject_id: '',
                          }))
                        }
                      >
                        <option value="">اختر المرحلة</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {stageGradesPreview.length > 0 ? (
                        <p className="mt-2 text-[12.5px] text-ink-dim">
                          تشمل: {stageGradesPreview.join('، ')}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <label className={formLabelClass}>الصف</label>
                      <select
                        className={formFieldClass}
                        value={form.grade_id}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            grade_id: e.target.value,
                            subject_id: '',
                          }))
                        }
                      >
                        <option value="">اختر الصف</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                            {g.educational_stage?.name ? ` — ${g.educational_stage.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : null}

              {showSubject ? (
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>المادة</label>
                  <select
                    className={formFieldClass}
                    value={form.subject_id}
                    disabled={
                      form.scope === 'grade' ? !form.grade_id : !form.educational_stage_id
                    }
                    onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
                  >
                    <option value="">
                      {form.scope === 'stage'
                        ? form.educational_stage_id
                          ? 'اختر المادة'
                          : 'اختر المرحلة أولًا'
                        : form.grade_id
                          ? 'اختر المادة'
                          : 'اختر الصف أولًا'}
                    </option>
                    {subjectOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {showCount ? (
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>عدد المواد المطلوب اختيارها</label>
                  <input
                    className={`${formFieldClass} font-latin text-left`}
                    dir="ltr"
                    type="number"
                    min="1"
                    step="1"
                    value={form.subject_selection_count}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject_selection_count: e.target.value }))
                    }
                    placeholder="مثال: 4"
                  />
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <label className={formLabelClass}>مدة الباقة</label>
                <select
                  className={formFieldClass}
                  value={
                    form.duration_type === 'monthly_recurring'
                      ? 'monthly'
                      : form.duration_academic_period_id
                        ? `period:${form.duration_academic_period_id}`
                        : form.duration_period_id
                          ? `duration:${form.duration_period_id}`
                          : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'monthly') {
                      setForm((f) => ({
                        ...f,
                        duration_type: 'monthly_recurring',
                        duration_academic_period_id: '',
                        duration_period_id: '',
                      }));
                      return;
                    }
                    if (v.startsWith('period:')) {
                      setForm((f) => ({
                        ...f,
                        duration_type: 'fixed_period',
                        duration_academic_period_id: v.slice('period:'.length),
                        duration_period_id: '',
                      }));
                      return;
                    }
                    if (v.startsWith('duration:')) {
                      setForm((f) => ({
                        ...f,
                        duration_type: 'fixed_period',
                        duration_academic_period_id: '',
                        duration_period_id: v.slice('duration:'.length),
                      }));
                    }
                  }}
                >
                  <option value="">اختر المدة…</option>
                  <option value="monthly">شهري متجدد</option>
                  {durationPeriods.map((p) => {
                    const status = periodStatusLabel(p.status);
                    return (
                      <option key={p.id} value={`period:${p.id}`}>
                        {p.name}
                        {p.start_date && p.end_date ? ` (${p.start_date} → ${p.end_date})` : ''}
                        {status ? ` — ${status}` : ''}
                      </option>
                    );
                  })}
                  {durations
                    .filter(
                      (d) =>
                        !durationPeriods.some(
                          (p) =>
                            p.name === d.name &&
                            p.start_date === d.start_date &&
                            p.end_date === d.end_date,
                        ),
                    )
                    .map((d) => (
                      <option
                        key={`d-${d.id}`}
                        value={`duration:${d.id}`}
                        disabled={!editing && d.status === 'expired'}
                      >
                        {d.name} ({d.start_date} → {d.end_date})
                      </option>
                    ))}
                </select>
                {durationPeriods.length === 0 ? (
                  <p className="mt-2 text-[12.5px] text-ink-dim">
                    لا توجد فترات دراسية بعد. أضف الفصل الأول/الثاني من صفحة الفترات الدراسية لتظهر هنا.
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>
                  خطة التقسيط{' '}
                  <span className="font-normal text-ink-faint">(اختياري)</span>
                </label>
                <div className="flex flex-wrap items-stretch gap-2">
                  <select
                    className={`${formFieldClass} min-w-0 flex-1`}
                    value={form.installment_template_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, installment_template_id: e.target.value }))
                    }
                  >
                    <option value="">بدون تقسيط</option>
                    {installmentTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.number_of_installments} دفعات)
                      </option>
                    ))}
                  </select>
                  {canManageInstallments ? (
                    <>
                      <button
                        type="button"
                        onClick={openEditInstallment}
                        disabled={!form.installment_template_id}
                        className="rounded-full border border-cream-line bg-white px-3.5 py-2 text-[12.5px] font-bold text-ink-soft disabled:opacity-40"
                      >
                        تعديل الخطة
                      </button>
                      <button
                        type="button"
                        onClick={openCreateInstallment}
                        className="rounded-full border border-[#dce8f0] bg-[#f4f9fc] px-3.5 py-2 text-[12.5px] font-bold text-navy"
                      >
                        + خطة جديدة
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <label className={formLabelClass}>السعر</label>
                <input
                  className={`${formFieldClass} font-latin text-left`}
                  dir="ltr"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>
                  السعر قبل الخصم <span className="font-normal text-ink-faint">(اختياري)</span>
                </label>
                <input
                  className={`${formFieldClass} font-latin text-left`}
                  dir="ltr"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.compare_at_price}
                  onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gold"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  باقة نشطة
                </label>
              </div>
            </>
          ) : (
            <p className="sm:col-span-2 text-[13px] text-ink-soft">
              اختر نوع الباقة أولاً لإظهار الحقول المناسبة.
            </p>
          )}
        </div>
      </FormModal>

      <FormModal
        open={installmentModalOpen}
        onClose={() => {
          if (!saveInstallmentMutation.isPending) {
            setInstallmentModalOpen(false);
            setEditingInstallment(null);
          }
        }}
        title={editingInstallment ? 'تعديل خطة تقسيط' : 'إضافة خطة تقسيط'}
        eyebrow="INSTALLMENTS"
        footer={
          <>
            <button
              type="button"
              onClick={() => setInstallmentModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveInstallmentMutation.isPending || !installmentSumValid}
              onClick={() => {
                if (!installmentForm.name.trim()) {
                  toast.error('أدخل اسم الخطة');
                  return;
                }
                if (!installmentSumValid) {
                  toast.error('مجموع النسب يجب أن يساوي 100%');
                  return;
                }
                saveInstallmentMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-50"
            >
              {saveInstallmentMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={installmentForm.name}
              onChange={(e) => setInstallmentForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: دفعتين 50/50"
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
              value={installmentForm.count}
              onChange={(e) => setInstallmentCount(e.target.value)}
            />
          </div>
          <div className="space-y-2.5">
            <label className={formLabelClass}>تفاصيل الدفعات</label>
            {installmentForm.rows.map((row, index) => (
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
                      setInstallmentForm((f) => {
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
                      setInstallmentForm((f) => {
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
            className={`text-[13.5px] font-bold ${installmentSumValid ? 'text-[#2e7d4f]' : 'text-[#a34b4b]'}`}
          >
            مجموع النسب: {installmentPercentageSum.toFixed(2)}%
            {!installmentSumValid ? ' — يجب أن يساوي 100% بالضبط' : ''}
          </p>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الباقة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}».`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
