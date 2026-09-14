'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { ConfirmDialog, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  ApiError,
  apiClient,
  type AdminRole,
  type PermissionsGrouped,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const MODULE_LABELS: Record<string, string> = {
  branches: 'الفروع',
  halls: 'القاعات',
  subjects: 'المواد',
  stages: 'المراحل',
  grades: 'الصفوف',
  periods: 'الفترات الدراسية',
  'product-types': 'أنواع الباقات',
  plans: 'الباقات',
  durations: 'مدد الباقات',
  'course-groups': 'عروض المواد',
  'class-schedules': 'الجداول',
  users: 'المستخدمون',
  students: 'الطلاب',
  guardians: 'أولياء الأمور',
  enrollments: 'التسجيلات',
  invoices: 'الفواتير',
  subscriptions: 'الاشتراكات',
  coupons: 'الكوبونات',
  sessions: 'الحصص',
  attendance: 'الحضور',
  payroll: 'الرواتب',
  teachers: 'المعلمون',
  products: 'المنتجات',
  'delivery-zones': 'مناطق التوصيل',
  orders: 'الطلبات',
  'private-lessons': 'الحصص الخاصة',
  installments: 'التقسيط',
  'family-discounts': 'خصومات الأسرة',
  reports: 'التقارير',
  evaluations: 'التقييمات',
  materials: 'المواد التعليمية',
  exams: 'الاختبارات',
  roles: 'الأدوار والصلاحيات',
  'staff-attendance': 'دوام الموظفين',
  leaves: 'الإجازات',
  'support-tickets': 'التواصل',
  notifications: 'الإشعارات',
  'audit-logs': 'سجل التدقيق',
  settings: 'الإعدادات',
  marketing: 'التسويق',
  'teacher-portal': 'بوابة المعلم',
  'absence-alerts': 'تنبيه الغياب',
};

function moduleLabel(module: string) {
  return MODULE_LABELS[module] ?? module;
}

function permissionActionLabel(name: string) {
  const action = name.includes('.') ? name.split('.').slice(1).join('.') : name;
  const map: Record<string, string> = {
    view: 'عرض',
    manage: 'إدارة',
    'manage-any': 'إدارة الكل',
    classes: 'صفوفي',
    payroll: 'راتبي',
    leaves: 'إجازاتي',
  };
  // teacher-portal.view = بوابتي
  if (name === 'teacher-portal.view') return 'بوابتي';
  return map[action] ?? action;
}

const cell = 'px-4 py-3 text-center align-middle';
const headCell = 'whitespace-nowrap px-4 py-3 text-center text-[11.5px] font-bold text-ink-dim';

type EditorState = {
  mode: 'create' | 'edit';
  roleId?: number;
  name: string;
  permissions: string[];
  isAdmin: boolean;
};

export function RolesPage() {
  const canView = useAuthStore((s) => s.hasPermission('roles.view'));
  const canManage = useAuthStore((s) => s.hasPermission('roles.manage'));
  const qc = useQueryClient();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient<AdminRole[] | { data: AdminRole[] }>('/roles');
      if (Array.isArray(res)) return res;
      return res.data ?? [];
    },
    enabled: canView,
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => apiClient<PermissionsGrouped>('/permissions'),
    enabled: canView && Boolean(editor),
  });

  const roles = rolesQuery.data ?? [];
  const grouped = permissionsQuery.data ?? {};
  const modules = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editor) return;
      const payload = {
        name: editor.name.trim(),
        permissions: editor.permissions,
      };
      if (editor.mode === 'edit' && editor.roleId) {
        return apiClient<AdminRole>(`/roles/${editor.roleId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient<AdminRole>('/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editor?.mode === 'edit' ? 'تم تحديث الدور' : 'تم إنشاء الدور');
      setEditor(null);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الدور');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : err.message);
    },
  });

  async function openCreate() {
    setEditor({
      mode: 'create',
      name: '',
      permissions: [],
      isAdmin: false,
    });
    setOpenModules({});
  }

  async function openEdit(role: AdminRole) {
    try {
      const full = await apiClient<AdminRole>(`/roles/${role.id}`);
      setEditor({
        mode: 'edit',
        roleId: full.id,
        name: full.name,
        permissions: full.permissions ?? [],
        isAdmin: full.name === 'admin',
      });
      setOpenModules({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر تحميل الدور');
    }
  }

  function togglePermission(name: string) {
    setEditor((prev) => {
      if (!prev) return prev;
      const has = prev.permissions.includes(name);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((p) => p !== name)
          : [...prev.permissions, name],
      };
    });
  }

  function toggleModuleAll(module: string, perms: string[]) {
    setEditor((prev) => {
      if (!prev) return prev;
      const allSelected = perms.every((p) => prev.permissions.includes(p));
      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !perms.includes(p)),
        };
      }
      return {
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...perms])),
      };
    });
  }

  function canSaveEditor() {
    if (!editor) return false;
    if (!editor.name.trim()) return false;
    if (editor.isAdmin && editor.permissions.length === 0) return false;
    return true;
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="الأدوار والصلاحيات" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
        </AdminContent>
      </>
    );
  }

  if (editor) {
    return (
      <>
        <AdminHeader
          title={editor.mode === 'edit' ? `تعديل: ${editor.name || 'دور'}` : 'دور جديد'}
          crumb="النظام ← الأدوار والصلاحيات"
        />
        <AdminContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (!saveMutation.isPending) setEditor(null);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[13px] font-semibold text-ink-soft"
            >
              <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
              رجوع للقائمة
            </button>
            {editor.isAdmin ? (
              <span className="rounded-full bg-[#eaf0f8] px-3 py-1 text-[11.5px] font-bold text-[#1c4b8f]">
                دور أساسي محمي — لا يمكن تفريغ كل الصلاحيات
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-5">
              <label className={formLabelClass}>اسم الدور</label>
              <input
                className={`${formFieldClass} max-w-md`}
                value={editor.name}
                disabled={editor.isAdmin}
                onChange={(e) => setEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                placeholder="مثال: مشرف أكاديمي"
              />
              {editor.isAdmin ? (
                <p className="mt-1.5 text-[12px] text-ink-dim">لا يمكن تغيير اسم دور المسؤول الأساسي.</p>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
              <div className="flex items-center justify-between border-b border-[#f0ece1] bg-[#faf8f3] px-5 py-3.5">
                <div>
                  <h2 className="text-[14.5px] font-extrabold text-ink">الصلاحيات</h2>
                  <p className="mt-0.5 text-[12px] text-ink-dim">
                    محدد: {editor.permissions.length}
                    {editor.isAdmin && editor.permissions.length === 0
                      ? ' — يجب اختيار صلاحية واحدة على الأقل'
                      : ''}
                  </p>
                </div>
              </div>

              {permissionsQuery.isLoading ? (
                <div className="p-5 text-[13px] text-ink-dim">جاري تحميل الصلاحيات…</div>
              ) : (
                <div className="divide-y divide-[#f0ebe0]">
                  {modules.map((module) => {
                    const perms = grouped[module] ?? [];
                    const open = openModules[module] ?? false;
                    const selectedCount = perms.filter((p) => editor.permissions.includes(p)).length;
                    const allSelected = perms.length > 0 && selectedCount === perms.length;

                    return (
                      <div key={module}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenModules((prev) => ({ ...prev, [module]: !open }))
                          }
                          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-start hover:bg-cream-soft"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              name={open ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-left'}
                              className="text-[11px] text-ink-faint"
                            />
                            <span className="text-[14px] font-extrabold text-ink">
                              {moduleLabel(module)}
                            </span>
                            <span className="rounded-full bg-cream-soft px-2 py-0.5 text-[11px] font-bold text-ink-dim">
                              {selectedCount}/{perms.length}
                            </span>
                          </div>
                        </button>

                        {open ? (
                          <div className="space-y-2 bg-[#fbfaf7] px-5 pb-4 pt-1">
                            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-bold text-navy">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleModuleAll(module, perms)}
                              />
                              تحديد الكل
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {perms.map((perm) => (
                                <label
                                  key={perm}
                                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-cream-line bg-white px-3 py-2.5 text-[12.5px]"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={editor.permissions.includes(perm)}
                                    onChange={() => togglePermission(perm)}
                                  />
                                  <span>
                                    <span className="block font-bold text-ink">
                                      {permissionActionLabel(perm)}
                                    </span>
                                    <span className="font-latin text-[11px] text-ink-dim" dir="ltr">
                                      {perm}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditor(null)}
                disabled={saveMutation.isPending}
                className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending || !canSaveEditor() || !canManage}
                onClick={() => saveMutation.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-50"
              >
                {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ الدور'}
              </button>
            </div>
          </div>
        </AdminContent>
      </>
    );
  }

  const loading = rolesQuery.isLoading;
  const isEmpty = !loading && !rolesQuery.isError && roles.length === 0;

  return (
    <>
      <AdminHeader title="الأدوار والصلاحيات" crumb="النظام ← الأدوار والصلاحيات" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ebe0] p-3.5">
            <p className="text-[13px] text-ink-dim">إدارة الأدوار وربط الصلاحيات ديناميكيًا دون تعديل بالكود.</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => void openCreate()}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)]"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> دور جديد
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={4} /> : null}
          {rolesQuery.isError ? (
            <EmptyState
              icon="fa-solid fa-triangle-exclamation"
              title="تعذر تحميل الأدوار"
              body={rolesQuery.error instanceof Error ? rolesQuery.error.message : 'حدث خطأ غير متوقع.'}
            />
          ) : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-user-shield"
              title="لا توجد أدوار"
              body="أنشئ أول دور وحدد صلاحياته."
              primary={canManage ? { label: 'دور جديد', onClick: () => void openCreate() } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-center">
                <thead>
                  <tr className="bg-cream-soft">
                    {['اسم الدور', 'الصلاحيات', 'المستخدمون', ...(canManage ? ['إجراءات'] : [])].map(
                      (c) => (
                        <th key={c} className={headCell}>
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const isAdmin = role.name === 'admin';
                    return (
                      <tr
                        key={role.id}
                        className={`border-t border-[#f4f1ea] hover:bg-cream-soft ${
                          isAdmin ? 'bg-[linear-gradient(90deg,rgba(28,75,143,0.06),transparent)]' : ''
                        }`}
                      >
                        <td className={cell}>
                          <div className="inline-flex flex-wrap items-center justify-center gap-2">
                            <span className="text-[13.5px] font-extrabold text-ink">{role.name}</span>
                            {isAdmin ? (
                              <span className="rounded-full bg-[#eaf0f8] px-2.5 py-0.5 text-[11px] font-bold text-[#1c4b8f]">
                                دور أساسي محمي
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${cell} font-latin text-[13px] text-ink-soft`}>
                          {role.permissions_count ?? 0}
                        </td>
                        <td className={`${cell} font-latin text-[13px] text-ink-soft`}>
                          {role.users_count ?? 0}
                        </td>
                        {canManage ? (
                          <td className={cell}>
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                aria-label="تعديل"
                                onClick={() => void openEdit(role)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                              >
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                              {!isAdmin ? (
                                <button
                                  type="button"
                                  aria-label="حذف"
                                  onClick={() => setDeleteTarget(role)}
                                  className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                                >
                                  <Icon name="fa-solid fa-trash" className="text-[11px]" />
                                </button>
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
      </AdminContent>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="حذف الدور؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». لا يمكن التراجع عن هذا الإجراء.`}
        loading={deleteMutation.isPending}
        confirmLabel="حذف"
      />
    </>
  );
}
