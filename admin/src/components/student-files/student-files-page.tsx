'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  FileNumberBadge,
  StudentStatusBadge,
} from '@/components/student-files/student-status-badge';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { apiClient, qs, type Grade, type Paginated, type Student, type StudentStatus } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { STATUSES } from '@/components/student-files/student-shared';

function stageLabel(student: Student) {
  const grade = student.current_grade;
  if (!grade) return '—';
  return grade.educational_stage?.name
    ? `${grade.educational_stage.name} — ${grade.name}`
    : grade.name;
}

export function StudentFilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guardianIdFilter = searchParams.get('guardian_id') ?? '';

  const canManage = useAuthStore((s) => s.hasPermission('students.manage'));
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () => apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100 })}`),
  });

  const studentsQuery = useQuery({
    queryKey: ['student-files', debouncedSearch, gradeId, status, guardianIdFilter],
    queryFn: () =>
      apiClient<Paginated<Student>>(
        `/students${qs({
          include: 'guardian,currentGrade.educationalStage',
          per_page: 50,
          'filter[search]': debouncedSearch.trim() || undefined,
          'filter[current_grade_id]': gradeId || undefined,
          'filter[status]': status || undefined,
          'filter[guardian_id]': guardianIdFilter || undefined,
        })}`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الطالب');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['student-files'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const grades = gradesQuery.data?.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const loading = studentsQuery.isLoading;
  const isEmpty = !loading && students.length === 0;

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  return (
    <>
      <AdminHeader title="ملفات الطلاب" crumb="إدارة الطلاب ← السجل" />

      <AdminContent>
        <div className="mb-4 overflow-hidden rounded-[18px] border border-cream-line bg-white p-4">
          <div className="relative">
            <Icon
              name="fa-solid fa-magnifying-glass"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-faint"
            />
            <input
              className="w-full rounded-[14px] border border-cream-line2 bg-cream-soft py-3.5 pl-4 pr-11 text-[14px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
              placeholder="ابحث بالاسم، الرقم المدني، أو رقم الملف"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className={selectCls} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              <option value="">كل الصفوف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus | '')}
            >
              <option value="">كل الحالات</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {guardianIdFilter ? (
              <Link
                href="/dashboard/student-files"
                className="flex items-center gap-1.5 rounded-full border border-[#eaf0f8] bg-[#f5f8fc] px-3 py-1.5 text-[12px] font-semibold text-[#1c4b8f]"
              >
                <Icon name="fa-solid fa-xmark" className="text-[10px]" />
                إلغاء فلتر الإخوة/الأخوات
              </Link>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">
              {studentsQuery.data?.meta?.total ?? students.length} طالب
            </div>
            {canManage ? (
              <Link
                href="/dashboard/student-files/new"
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة طالب جديد
              </Link>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={8} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-folder-open"
              title="لا توجد ملفات طلاب"
              body="ابحث باسم الطالب أو المدرسة أو الهاتف أو الرقم المدني، أو أضف طالبًا جديدًا."
              primary={
                canManage
                  ? { label: 'إضافة طالب جديد', onClick: () => router.push('/dashboard/student-files/new') }
                  : undefined
              }
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-center">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الاسم',
                      'المرحلة',
                      'المدرسة',
                      'هاتف التواصل',
                      'الرقم المدني',
                      'الحالة',
                      ...(canManage ? ['إجراءات'] : []),
                    ].map((c, i) => (
                      <th
                        key={`${c}-${i}`}
                        className="whitespace-nowrap px-4 py-3 text-center text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="cursor-pointer border-t border-[#f4f1ea] hover:bg-cream-soft"
                      onClick={() => router.push(`/dashboard/student-files/${student.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="text-[13.5px] font-bold text-ink">{student.full_name}</span>
                          <FileNumberBadge fileNumber={student.file_number} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {stageLabel(student)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {student.previous_school || '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                        <div>{student.phone || '—'}</div>
                        {student.phone_secondary ? (
                          <div className="mt-0.5 text-[11.5px] text-ink-dim">{student.phone_secondary}</div>
                        ) : null}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-dim" dir="ltr">
                        {student.civil_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {student.status ? <StudentStatusBadge status={student.status} /> : '—'}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              aria-label="عرض"
                              onClick={() => router.push(`/dashboard/student-files/${student.id}`)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-eye" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(student)}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف ملف الطالب؟"
        body={`سيتم حذف «${deleteTarget?.full_name ?? ''}» (${deleteTarget?.file_number ?? ''}).`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
