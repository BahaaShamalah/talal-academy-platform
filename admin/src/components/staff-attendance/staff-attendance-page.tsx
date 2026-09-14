'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type AdminUser,
  type Paginated,
  type StaffAttendanceRecord,
  type StaffAttendanceStatus,
  type StaffAttendanceSummary,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type EditForm = {
  check_in_time: string;
  check_out_time: string;
  status: StaffAttendanceStatus;
  late_minutes: string;
  overtime_minutes: string;
  notes: string;
};

const STATUS_OPTIONS: StaffAttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
];

export function StaffAttendancePage() {
  const canView = useAuthStore((s) => s.hasPermission('staff-attendance.view'));
  const canManage = useAuthStore((s) => s.hasPermission('staff-attendance.manage'));
  const qc = useQueryClient();

  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<StaffAttendanceRecord | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [summaryUserId, setSummaryUserId] = useState('');
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryOpen, setSummaryOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users-for-attendance'],
    queryFn: () => apiClient<Paginated<AdminUser>>(`/users${qs({ per_page: 100 })}`),
    enabled: canView,
  });
  const users = usersQuery.data?.data ?? [];

  const query = useQuery({
    queryKey: ['staff-attendance', userId, dateFrom, dateTo, status],
    queryFn: () =>
      apiClient<Paginated<StaffAttendanceRecord>>(
        `/staff-attendance${qs({
          per_page: 100,
          'filter[user_id]': userId || undefined,
          'filter[status]': status || undefined,
          'filter[date]': dateFrom && dateFrom === dateTo ? dateFrom : undefined,
        })}`,
      ),
    enabled: canView,
  });

  const rows = useMemo(() => {
    let list = query.data?.data ?? [];
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    return list;
  }, [query.data, dateFrom, dateTo]);

  const summaryQuery = useQuery({
    queryKey: ['staff-attendance-summary', summaryUserId, summaryMonth],
    queryFn: async () => {
      const res = await apiClient<{ data: StaffAttendanceSummary }>(
        `/staff-attendance/summary${qs({ user_id: summaryUserId, month: summaryMonth })}`,
      );
      return res.data;
    },
    enabled: summaryOpen && Boolean(summaryUserId) && Boolean(summaryMonth),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing || !form) throw new Error('لا سجل');
      return apiClient(`/staff-attendance/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
          status: form.status,
          late_minutes: form.late_minutes === '' ? null : Number(form.late_minutes),
          overtime_minutes: form.overtime_minutes === '' ? null : Number(form.overtime_minutes),
          notes: form.notes.trim() || null,
        }),
      });
    },
    onSuccess: () => {
      toast.success('تم تحديث السجل');
      setEditing(null);
      setForm(null);
      qc.invalidateQueries({ queryKey: ['staff-attendance'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openEdit(row: StaffAttendanceRecord) {
    setEditing(row);
    setForm({
      check_in_time: row.check_in_time ? String(row.check_in_time).slice(0, 5) : '',
      check_out_time: row.check_out_time ? String(row.check_out_time).slice(0, 5) : '',
      status: row.status,
      late_minutes: row.late_minutes != null ? String(row.late_minutes) : '',
      overtime_minutes: row.overtime_minutes != null ? String(row.overtime_minutes) : '',
      notes: row.notes ?? '',
    });
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="دوام الموظفين" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="دوام الموظفين" crumb="الموارد البشرية ← دوام الموظفين" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-end gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="min-w-[160px]">
              <label className={formLabelClass}>الموظف</label>
              <select className={formFieldClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">الكل</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formLabelClass}>من تاريخ</label>
              <input type="date" className={`${formFieldClass} font-latin`} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className={formLabelClass}>إلى تاريخ</label>
              <input type="date" className={`${formFieldClass} font-latin`} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className={formLabelClass}>الحالة</label>
              <select className={formFieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">الكل</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setSummaryUserId(userId || (users[0] ? String(users[0].id) : ''));
                setSummaryOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3.5 py-2.5 text-[12.5px] font-bold text-navy"
            >
              <Icon name="fa-solid fa-chart-pie" className="text-[11px]" />
              عرض ملخص شهري
            </button>
          </div>

          {query.isLoading ? <TableSkeleton cols={7} /> : null}
          {!query.isLoading && rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-user-clock" title="لا سجلات" body="لا توجد سجلات دوام مطابقة." />
          ) : null}
          {!query.isLoading && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الموظف', 'التاريخ', 'حضور', 'انصراف', 'الحالة', 'تأخير/إضافي', ...(canManage ? [''] : [])].map(
                      (c, i) => (
                        <th key={`${c}-${i}`} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13px] font-bold">{row.user?.name ?? `#${row.user_id}`}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">{row.date}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">{row.check_in_time?.slice(0, 5) ?? '—'}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">{row.check_out_time?.slice(0, 5) ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="font-latin px-4 py-3 text-[12px] text-ink-soft">
                        تأخير {row.late_minutes ?? 0} · إضافي {row.overtime_minutes ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                          >
                            <Icon name="fa-solid fa-pen" className="text-[11px]" />
                          </button>
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
        open={Boolean(editing && form)}
        onClose={() => {
          if (!saveMutation.isPending) {
            setEditing(null);
            setForm(null);
          }
        }}
        title="تعديل سجل الدوام"
        eyebrow="ATTENDANCE"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(null);
              }}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              حفظ
            </button>
          </>
        }
      >
        {form ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>وقت الحضور</label>
              <input
                type="time"
                className={`${formFieldClass} font-latin`}
                value={form.check_in_time}
                onChange={(e) => setForm({ ...form, check_in_time: e.target.value })}
              />
            </div>
            <div>
              <label className={formLabelClass}>وقت الانصراف</label>
              <input
                type="time"
                className={`${formFieldClass} font-latin`}
                value={form.check_out_time}
                onChange={(e) => setForm({ ...form, check_out_time: e.target.value })}
              />
            </div>
            <div>
              <label className={formLabelClass}>الحالة</label>
              <select
                className={formFieldClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StaffAttendanceStatus })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formLabelClass}>دقائق التأخير</label>
              <input
                type="number"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.late_minutes}
                onChange={(e) => setForm({ ...form, late_minutes: e.target.value })}
              />
            </div>
            <div>
              <label className={formLabelClass}>دقائق الإضافي</label>
              <input
                type="number"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.overtime_minutes}
                onChange={(e) => setForm({ ...form, overtime_minutes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formLabelClass}>ملاحظات</label>
              <textarea
                className={formFieldClass}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        ) : null}
      </FormModal>

      <FormModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="ملخص شهري للدوام"
        eyebrow="SUMMARY"
        footer={
          <button
            type="button"
            onClick={() => setSummaryOpen(false)}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>الموظف</label>
            <select
              className={formFieldClass}
              value={summaryUserId}
              onChange={(e) => setSummaryUserId(e.target.value)}
            >
              <option value="">اختر…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>الشهر</label>
            <input
              type="month"
              className={`${formFieldClass} font-latin`}
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
            />
          </div>
        </div>
        {summaryQuery.isLoading ? <p className="text-[13px] text-ink-dim">جاري التحميل…</p> : null}
        {summaryQuery.data ? (
          <div className="space-y-2 rounded-xl border border-cream-line bg-[#fbfaf7] p-3.5 text-[13px]">
            <div className="flex justify-between"><span>أيام الحضور</span><strong>{summaryQuery.data.present_days}</strong></div>
            <div className="flex justify-between"><span>أيام الغياب</span><strong>{summaryQuery.data.absent_days}</strong></div>
            <div className="flex justify-between"><span>أيام التأخير</span><strong>{summaryQuery.data.late_days}</strong></div>
            <div className="flex justify-between"><span>إجمالي دقائق التأخير</span><strong className="font-latin">{summaryQuery.data.total_late_minutes}</strong></div>
            <div className="flex justify-between"><span>إجمالي دقائق الإضافي</span><strong className="font-latin">{summaryQuery.data.total_overtime_minutes}</strong></div>
            <p className="mt-2 border-t border-cream-line pt-2 text-[12px] text-[#8a6a20]">
              استخدم هذا الرقم عند إدخال خصم يدوي بصفحة الرواتب.
            </p>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
