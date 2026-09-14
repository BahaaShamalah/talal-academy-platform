'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  type AdminRole,
  type AdminUser,
  type Branch,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير',
  teacher: 'معلم',
  accountant: 'محاسب',
  student: 'طالب',
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  roles: string[];
  is_teaching_staff: boolean;
  has_all_branch_access: boolean;
  branch_ids: number[];
};

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  roles: [],
  is_teaching_staff: false,
  has_all_branch_access: true,
  branch_ids: [],
};

const cell = 'px-4 py-3 text-center align-middle';
const headCell = 'whitespace-nowrap px-4 py-3 text-center text-[11.5px] font-bold text-ink-dim';

export function UsersPage() {
  const canView = useAuthStore((s) => s.hasPermission('users.view'));
  const canManage = useAuthStore((s) => s.hasPermission('users.manage'));
  const currentUserId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient<AdminRole[] | { data: AdminRole[] }>('/roles');
      if (Array.isArray(res)) return res;
      return res.data ?? [];
    },
    enabled: canView,
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient<Paginated<Branch>>(`/branches${qs({ per_page: 100 })}`),
    enabled: canManage,
  });

  const availableRoles = rolesQuery.data ?? [];
  const allBranches = branchesQuery.data?.data ?? [];

  const query = useQuery({
    queryKey: ['users', role],
    queryFn: () =>
      apiClient<Paginated<AdminUser>>(
        `/users${qs({
          per_page: 100,
          'filter[role]': role || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const users = query.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q),
    );
  }, [users, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        roles: form.roles,
        is_teaching_staff: form.is_teaching_staff,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      }
      let userId = editing?.id;
      if (editing) {
        await apiClient(`/users/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiClient<{ data?: AdminUser } | AdminUser>('/users', {
          method: 'POST',
          body: JSON.stringify({ ...payload, password: form.password }),
        });
        const data = 'data' in created && created.data ? created.data : (created as AdminUser);
        userId = data.id;
      }
      if (userId) {
        await apiClient(`/users/${userId}/branches`, {
          method: 'PUT',
          body: JSON.stringify({
            has_all_branch_access: form.has_all_branch_access,
            branch_ids: form.has_all_branch_access ? [] : form.branch_ids,
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المستخدم');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      roles: availableRoles.some((r) => r.name === 'teacher') ? ['teacher'] : [],
      has_all_branch_access: true,
      branch_ids: [],
    });
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      roles: user.roles ?? [],
      is_teaching_staff: Boolean(user.is_teaching_staff),
      has_all_branch_access: Boolean(user.has_all_branch_access),
      branch_ids: (user.branches ?? []).map((b) => b.id),
    });
    setModalOpen(true);
  }

  function toggleRole(value: string) {
    setForm((prev) => {
      const has = prev.roles.includes(value);
      const roles = has ? prev.roles.filter((r) => r !== value) : [...prev.roles, value];
      return { ...prev, roles };
    });
  }

  function toggleBranch(id: number) {
    setForm((prev) => {
      const has = prev.branch_ids.includes(id);
      return {
        ...prev,
        branch_ids: has ? prev.branch_ids.filter((x) => x !== id) : [...prev.branch_ids, id],
      };
    });
  }

  function canSave() {
    if (!form.name.trim() || !form.email.trim() || form.roles.length === 0) return false;
    if (!editing && !form.password.trim()) return false;
    if (!form.has_all_branch_access && form.branch_ids.length === 0) return false;
    return true;
  }

  const loading = query.isLoading;
  const isEmpty = !loading && filtered.length === 0;
  const columns = canManage ? 6 : 5;

  if (!canView) {
    return (
      <>
        <AdminHeader title="المستخدمون" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="المستخدمون" crumb="النظام ← المستخدمون" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="relative min-w-[200px] flex-1">
              <Icon
                name="fa-solid fa-magnifying-glass"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-faint"
              />
              <input
                className={`${formFieldClass} py-2.5 pe-9 text-[13px]`}
                placeholder="بحث بالاسم أو البريد أو الهاتف…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`${formFieldClass} w-auto min-w-[140px] py-2.5 text-[13px]`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">كل الأدوار</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.name}>
                  {roleLabel(r.name)}
                </option>
              ))}
            </select>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة مستخدم
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={columns} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-user-shield"
              title="لا يوجد مستخدمون"
              body={
                search || role
                  ? 'لا نتائج مطابقة للبحث أو الفلتر.'
                  : 'أضف مستخدمين جدد وأسند لهم الأدوار المناسبة.'
              }
              primary={canManage ? { label: 'إضافة مستخدم', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-center">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'البريد', 'الهاتف', 'الأدوار', 'تاريخ الإنشاء', ...(canManage ? ['إجراءات'] : [])].map(
                      (c) => (
                        <th key={c} className={headCell}>
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className={cell}>
                        <div className="inline-flex items-center justify-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-[12px] font-bold text-gold-soft">
                            {u.name.slice(0, 1)}
                          </span>
                          <span className="text-[13.5px] font-bold text-ink">{u.name}</span>
                          {u.is_teaching_staff ? (
                            <span className="rounded-full bg-[#f7f0e1] px-2 py-0.5 text-[10.5px] font-bold text-[#8a6a20]">
                              معلم بالقوائم
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${cell} font-latin text-[13px] text-ink-soft`} dir="ltr">
                        {u.email}
                      </td>
                      <td className={`${cell} font-latin text-[13px] text-ink-soft`} dir="ltr">
                        {u.phone || '—'}
                      </td>
                      <td className={cell}>
                        <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                          {(u.roles ?? []).length === 0 ? (
                            <span className="text-[12px] text-ink-dim">—</span>
                          ) : (
                            (u.roles ?? []).map((r) => (
                              <span
                                key={r}
                                className="rounded-full border border-cream-line bg-cream-soft px-2.5 py-0.5 text-[11.5px] font-bold text-ink-soft"
                              >
                                {roleLabel(r)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className={`${cell} font-latin text-[12.5px] text-ink-dim`}>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      {canManage ? (
                        <td className={cell}>
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Link
                              href={`/dashboard/users/${u.id}/profile`}
                              aria-label="الملف الوظيفي"
                              className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-[9px] border border-cream-line bg-white text-ink-soft"
                              title="الملف الوظيفي"
                            >
                              <Icon name="fa-solid fa-id-card" className="text-[11px]" />
                            </Link>
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(u)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              disabled={u.id === currentUserId}
                              onClick={() => setDeleteTarget(u)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b] disabled:cursor-not-allowed disabled:opacity-40"
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
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        eyebrow="USER"
        wide
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
              disabled={saveMutation.isPending || !canSave()}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>البريد الإلكتروني</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الهاتف</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              كلمة المرور{editing ? ' (اتركها فارغة للإبقاء)' : ''}
            </label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>الأدوار (يمكن اختيار أكثر من دور)</label>
            {rolesQuery.isLoading ? (
              <p className="text-[12.5px] text-ink-dim">جاري تحميل الأدوار…</p>
            ) : availableRoles.length === 0 ? (
              <p className="text-[12.5px] text-ink-dim">لا توجد أدوار متاحة.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableRoles.map((r) => {
                  const active = form.roles.includes(r.name);
                  return (
                    <label
                      key={r.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] ${
                        active
                          ? 'border-navy bg-navy-800 text-gold-soft'
                          : 'border-cream-line2 bg-white text-ink-soft'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={active}
                        onChange={() => toggleRole(r.name)}
                      />
                      <span>
                        <span className="block font-bold">{roleLabel(r.name)}</span>
                        <span className={`text-[11px] ${active ? 'text-gold-soft/80' : 'text-ink-dim'}`}>
                          {r.permissions_count ?? 0} صلاحية · {r.users_count ?? 0} مستخدم
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-cream-line bg-[#fbfaf7] px-3.5 py-3">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.is_teaching_staff}
              onChange={(e) => setForm((f) => ({ ...f, is_teaching_staff: e.target.checked }))}
            />
            <span>
              <span className="block text-[13px] font-bold text-navy">يظهر كمعلم بقوائم الاختيار</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-dim">
                مستقل عن الأدوار — شخص بصلاحيات محاسب مثلًا قد يكون معلمًا فعليًا ويظهر عند اختيار معلم
                لعرض مادة أو الرواتب.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-cream-line bg-[#fbfaf7] px-3.5 py-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.has_all_branch_access}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    has_all_branch_access: e.target.checked,
                    branch_ids: e.target.checked ? [] : f.branch_ids,
                  }))
                }
              />
              <span>
                <span className="block text-[13px] font-bold text-navy">الوصول لكل الفروع</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-dim">
                  عند التفعيل لا حاجة لاختيار فروع محددة.
                </span>
              </span>
            </label>
            {!form.has_all_branch_access ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {allBranches.length === 0 ? (
                  <p className="text-[12.5px] text-ink-dim">لا توجد فروع.</p>
                ) : (
                  allBranches.map((b) => {
                    const active = form.branch_ids.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] ${
                          active
                            ? 'border-navy bg-navy-800 text-gold-soft'
                            : 'border-cream-line2 bg-white text-ink-soft'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleBranch(b.id)}
                        />
                        {b.name}
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="حذف المستخدم؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». لا يمكن التراجع عن هذا الإجراء.`}
        loading={deleteMutation.isPending}
        confirmLabel="حذف"
      />
    </>
  );
}
