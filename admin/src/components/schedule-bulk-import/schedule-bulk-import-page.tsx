'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { Icon } from '@/components/ui/icon';
import { formFieldClass } from '@/components/ui/form-modal';
import {
  apiClient,
  qs,
  type ClassOffering,
  type ClassOfferingGender,
  type Grade,
  type GradeSection,
  type Hall,
  type Paginated,
  type Subject,
  type TeacherUser,
} from '@/lib/api-client';
import {
  createClassSchedule,
  deleteClassSchedule,
  updateClassSchedule,
} from '@/lib/class-schedules-api';
import { WEEKDAYS } from '@/lib/weekdays';
import { useAuthStore } from '@/stores/auth-store';

type BulkRow = {
  clientId: string;
  offering_id?: number;
  schedule_id?: number;
  grade_id: string;
  grade_section_id: string;
  grade_section_name: string;
  subject_id: string;
  teacher_id: string;
  hall_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  dirty?: boolean;
  result?: { success: boolean; offering_id?: number; error?: string };
};

type BulkImportResponse = {
  results: { success: boolean; offering_id?: number; error?: string }[];
  summary: { total: number; succeeded: number; failed: number };
};

function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

const emptyRow = (seed?: Partial<BulkRow>): BulkRow => ({
  clientId: crypto.randomUUID(),
  grade_id: seed?.grade_id ?? '',
  grade_section_id: seed?.grade_section_id ?? '',
  grade_section_name: seed?.grade_section_name ?? '',
  subject_id: '',
  teacher_id: seed?.teacher_id ?? '',
  hall_id: seed?.hall_id ?? '',
  day_of_week: seed?.day_of_week ?? '6',
  start_time: seed?.start_time ?? '16:00',
  end_time: seed?.end_time ?? '17:00',
  dirty: true,
});

function offeringsToRows(offerings: ClassOffering[], gradeId: string): BulkRow[] {
  const rows: BulkRow[] = [];
  for (const offering of offerings) {
    const sectionId = offering.grade_section_id != null ? String(offering.grade_section_id) : '';
    const sectionName = offering.grade_section?.name ?? '';
    const schedules = offering.schedules ?? [];
    if (schedules.length === 0) {
      rows.push({
        clientId: `off-${offering.id}`,
        offering_id: offering.id,
        grade_id: String(offering.grade_id),
        grade_section_id: sectionId,
        grade_section_name: sectionName,
        subject_id: String(offering.subject_id),
        teacher_id: String(offering.teacher_id),
        hall_id: String(offering.hall_id),
        day_of_week: '6',
        start_time: '16:00',
        end_time: '17:00',
        dirty: false,
      });
      continue;
    }
    for (const schedule of schedules) {
      rows.push({
        clientId: `sch-${schedule.id}`,
        offering_id: offering.id,
        schedule_id: schedule.id,
        grade_id: String(offering.grade_id),
        grade_section_id: sectionId,
        grade_section_name: sectionName,
        subject_id: String(offering.subject_id),
        teacher_id: String(offering.teacher_id),
        hall_id: String(offering.hall_id),
        day_of_week: String(schedule.day_of_week),
        start_time: normalizeTime(schedule.start_time),
        end_time: normalizeTime(schedule.end_time),
        dirty: false,
      });
    }
  }
  if (rows.length === 0) {
    return [emptyRow({ grade_id: gradeId })];
  }
  return rows;
}

function rowIsComplete(row: BulkRow): boolean {
  return Boolean(
    row.grade_id &&
      row.subject_id &&
      row.teacher_id &&
      row.hall_id &&
      row.day_of_week !== '' &&
      row.start_time &&
      row.end_time &&
      row.start_time < row.end_time,
  );
}

function bumpHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const next = ((h || 0) + 1) % 24;
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

function sectionOptionLabel(section: GradeSection): string {
  if (section.gender === 'male') return `${section.name} (ذكور)`;
  if (section.gender === 'female') return `${section.name} (إناث)`;
  return section.name;
}

function sectionsForGrade(
  sections: GradeSection[],
  gradeId: string,
  tab: ClassOfferingGender,
): GradeSection[] {
  return sections.filter(
    (s) =>
      String(s.grade_id) === gradeId && (!s.gender || s.gender === tab),
  );
}

export function ScheduleBulkImportPage() {
  const canManage = useAuthStore((s) => s.hasPermission('course-groups.manage'));
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialGender: ClassOfferingGender =
    searchParams.get('gender') === 'female' ? 'female' : 'male';
  const focusGradeId = searchParams.get('grade_id') ?? '';
  const focusGradeSectionId = searchParams.get('grade_section_id') ?? '';

  const [tab, setTab] = useState<ClassOfferingGender>(initialGender);
  const [forceAll, setForceAll] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([
    emptyRow(
      focusGradeId
        ? {
            grade_id: focusGradeId,
            grade_section_id: focusGradeSectionId,
          }
        : undefined,
    ),
    emptyRow(
      focusGradeId
        ? {
            grade_id: focusGradeId,
            grade_section_id: focusGradeSectionId,
          }
        : undefined,
    ),
    emptyRow(
      focusGradeId
        ? {
            grade_id: focusGradeId,
            grade_section_id: focusGradeSectionId,
          }
        : undefined,
    ),
  ]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const gradesQuery = useQuery({
    queryKey: ['bulk-import-grades'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 200, include: 'subjects' })}`),
  });

  const teachersQuery = useQuery({
    queryKey: ['bulk-import-teachers'],
    queryFn: () => apiClient<Paginated<TeacherUser>>(`/teachers${qs({ per_page: 200 })}`),
  });

  const hallsQuery = useQuery({
    queryKey: ['bulk-import-halls'],
    queryFn: () => apiClient<Paginated<Hall>>(`/halls${qs({ per_page: 200 })}`),
  });

  const sectionsQuery = useQuery({
    queryKey: ['bulk-import-sections', focusGradeId || 'all'],
    queryFn: () =>
      apiClient<Paginated<GradeSection>>(
        `/grade-sections${qs({
          per_page: 200,
          ...(focusGradeId ? { 'filter[grade_id]': focusGradeId } : {}),
        })}`,
      ),
  });

  const existingQuery = useQuery({
    queryKey: ['bulk-import-existing', focusGradeId, focusGradeSectionId, tab],
    queryFn: () =>
      apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({
          per_page: 200,
          include: 'schedules,subject,teacher,hall,gradeSection',
          grade_id: focusGradeId,
          gender: tab,
          ...(focusGradeSectionId
            ? { 'filter[grade_section_id]': focusGradeSectionId }
            : {}),
        })}`,
      ),
    enabled: Boolean(focusGradeId),
  });

  useEffect(() => {
    if (!focusGradeId || !existingQuery.data) return;
    const key = `${focusGradeId}-${focusGradeSectionId}-${tab}-${existingQuery.dataUpdatedAt}`;
    if (loadedKey === key) return;
    setRows(offeringsToRows(existingQuery.data.data ?? [], focusGradeId));
    setLoadedKey(key);
  }, [focusGradeId, tab, existingQuery.data, existingQuery.dataUpdatedAt, loadedKey]);

  const grades = gradesQuery.data?.data ?? [];
  const sections = sectionsQuery.data?.data ?? [];
  const teachers = teachersQuery.data?.data ?? [];
  const halls = hallsQuery.data?.data ?? [];
  const focusGrade = grades.find((g) => String(g.id) === focusGradeId);

  const subjectsForGrade = useMemo(() => {
    const map = new Map<number, Subject[]>();
    for (const grade of grades) {
      map.set(grade.id, grade.subjects ?? []);
    }
    return map;
  }, [grades]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const results: ({ success: boolean; offering_id?: number; error?: string } | null)[] =
        rows.map(() => null);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!rowIsComplete(row)) {
          continue;
        }
        if (row.offering_id && !row.dirty && row.result?.success !== false) {
          results[i] = { success: true, offering_id: row.offering_id };
          continue;
        }

        try {
          if (row.offering_id) {
            await apiClient(`/class-offerings/${row.offering_id}`, {
              method: 'PUT',
              body: JSON.stringify({
                subject_id: Number(row.subject_id),
                teacher_id: Number(row.teacher_id),
                hall_id: Number(row.hall_id),
                grade_section_id: row.grade_section_id ? Number(row.grade_section_id) : null,
              }),
            });

            const schedulePayload = {
              day_of_week: Number(row.day_of_week),
              start_time: row.start_time,
              end_time: row.end_time,
              force: forceAll,
            };

            if (row.schedule_id) {
              const updated = await updateClassSchedule(row.schedule_id, schedulePayload);
              if (!updated.ok) {
                results[i] = {
                  success: false,
                  error:
                    updated.message +
                    (updated.conflicts[0]?.message ? ` — ${updated.conflicts[0].message}` : ''),
                };
                continue;
              }
            } else {
              const created = await createClassSchedule({
                class_offering_id: row.offering_id,
                ...schedulePayload,
              });
              if (!created.ok) {
                results[i] = {
                  success: false,
                  error:
                    created.message +
                    (created.conflicts[0]?.message ? ` — ${created.conflicts[0].message}` : ''),
                };
                continue;
              }
              results[i] = {
                success: true,
                offering_id: row.offering_id,
              };
              continue;
            }

            results[i] = { success: true, offering_id: row.offering_id };
          } else {
            const res = await apiClient<BulkImportResponse>('/class-offerings/bulk-import', {
              method: 'POST',
              body: JSON.stringify({
                force_all: forceAll,
                rows: [
                  {
                    grade_id: Number(row.grade_id),
                    grade_section_id: row.grade_section_id
                      ? Number(row.grade_section_id)
                      : undefined,
                    grade_section_name: row.grade_section_name.trim() || undefined,
                    subject_id: Number(row.subject_id),
                    teacher_id: Number(row.teacher_id),
                    hall_id: Number(row.hall_id),
                    gender: tab,
                    schedules: [
                      {
                        day_of_week: Number(row.day_of_week),
                        start_time: row.start_time,
                        end_time: row.end_time,
                      },
                    ],
                  },
                ],
              }),
            });
            results[i] = res.results[0] ?? { success: false, error: 'فشل غير معروف' };
          }
        } catch (err) {
          results[i] = {
            success: false,
            error: err instanceof Error ? err.message : 'فشل الحفظ',
          };
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setRows((prev) =>
        prev.map((row, i) => {
          const result = results[i];
          if (!result) return row;
          return {
            ...row,
            result,
            dirty: result.success ? false : row.dirty,
            offering_id: result.offering_id ?? row.offering_id,
          };
        }),
      );
      const processed = results.filter(Boolean) as {
        success: boolean;
        offering_id?: number;
        error?: string;
      }[];
      const ok = processed.filter((r) => r.success).length;
      const fail = processed.length - ok;
      toast.success(`تم: ${ok} نجح، ${fail} فشل`);
      queryClient.invalidateQueries({ queryKey: ['schedule-grid'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-import-existing'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function updateRow(index: number, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, ...patch, dirty: true, result: undefined } : row,
      ),
    );
  }

  function addBlankRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      emptyRow({
        grade_id: focusGradeId || last?.grade_id || '',
        teacher_id: last?.teacher_id,
        hall_id: last?.hall_id,
        day_of_week: last?.day_of_week,
      }),
    ]);
  }

  function duplicateRow(index: number) {
    const source = rows[index];
    if (!source) return;
    const copy = emptyRow({
      grade_id: focusGradeId || source.grade_id,
      teacher_id: source.teacher_id,
      hall_id: source.hall_id,
      day_of_week: source.day_of_week,
      start_time: source.end_time,
      end_time: bumpHour(source.end_time),
    });
    setRows((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  async function removeRow(index: number) {
    const row = rows[index];
    if (!row) return;

    if (row.schedule_id) {
      try {
        await deleteClassSchedule(row.schedule_id);
        toast.success('تم حذف الموعد');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'فشل الحذف');
        return;
      }
    }

    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        return [emptyRow({ grade_id: focusGradeId })];
      }
      return next;
    });
  }

  function handleSave() {
    const hasWork = rows.some(
      (row) => rowIsComplete(row) && (row.dirty || !row.offering_id || row.result?.success === false),
    );
    if (!hasWork) {
      toast.error('لا توجد تغييرات للحفظ');
      return;
    }
    saveMutation.mutate();
  }

  if (!canManage) {
    return (
      <>
        <AdminHeader title="الجدول الدراسي" />
        <AdminContent>
          <p className="text-[13px] text-ink-dim">ليس لديك صلاحية إدارة الجداول.</p>
        </AdminContent>
      </>
    );
  }

  const selectCls = `${formFieldClass} min-w-0 py-1 text-[11.5px]`;
  const title = focusGrade
    ? `تعديل جدول ${focusGrade.name}${
        focusGradeSectionId
          ? ` — ${sections.find((s) => String(s.id) === focusGradeSectionId)?.name ?? 'شعبة'}`
          : ''
      }`
    : focusGradeId
      ? 'تعديل جدول الصف'
      : 'الجدول الدراسي';

  return (
    <>
      <AdminHeader
        title={title}
        crumb={focusGradeId ? 'تعديل حسب الصف' : 'إدخال جماعي'}
      />

      <AdminContent className="max-w-[1100px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full border border-cream-line bg-cream-soft p-1">
            {(
              [
                { id: 'male' as const, label: 'ذكور' },
                { id: 'female' as const, label: 'إناث' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setLoadedKey(null);
                }}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-all ${
                  tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/schedule-grid"
            className="text-[12px] font-bold text-gold hover:underline"
          >
            ← رجوع لعرض الجدول
          </Link>
        </div>

        {focusGradeId ? (
          <p className="mb-2 text-[12px] text-ink-dim">
            تعديل جدول <strong className="text-navy">{focusGrade?.name ?? 'الصف'}</strong>
            {existingQuery.isLoading ? ' — جاري تحميل الحصص…' : null}
          </p>
        ) : (
          <p className="mb-2 text-[11.5px] text-ink-dim">
            كل سطر = مادة + موعد. للتعديل حسب صف معيّن: ادخل من «عرض الجدول» ← زر التعديل بجانب الصف.
          </p>
        )}

        <div className="overflow-hidden rounded-[14px] border border-cream-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-right">
              <thead>
                <tr className="bg-cream-soft">
                  {['#', 'الصف', 'الشعبة', 'المادة', 'المعلم', 'القاعة', 'اليوم', 'من', 'إلى', ''].map(
                    (h) => (
                      <th
                        key={h || 'actions'}
                        className="whitespace-nowrap border-b border-cream-line px-1.5 py-2 text-[10.5px] font-bold text-ink-dim"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const gradeSubjects = row.grade_id
                    ? (subjectsForGrade.get(Number(row.grade_id)) ?? [])
                    : [];
                  const rowBg = row.result?.success
                    ? 'bg-[#edf7f0]'
                    : row.result?.success === false
                      ? 'bg-[#fdf0f0]'
                      : row.offering_id && !row.dirty
                        ? 'bg-[#f7fafc]'
                        : 'bg-white';

                  return (
                    <Fragment key={row.clientId}>
                      <tr className={`border-b border-cream-line ${rowBg}`}>
                        <td className="px-1.5 py-1 text-[11px] text-ink-dim">{rowIndex + 1}</td>
                        <td className="px-1 py-1">
                          <select
                            className={selectCls}
                            value={row.grade_id}
                            disabled={Boolean(focusGradeId)}
                            onChange={(e) =>
                              updateRow(rowIndex, { grade_id: e.target.value, subject_id: '' })
                            }
                          >
                            <option value="">—</option>
                            {grades.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={selectCls}
                            value={row.grade_section_id}
                            disabled={Boolean(focusGradeSectionId) || !row.grade_id}
                            onChange={(e) => {
                              const section = sections.find((s) => String(s.id) === e.target.value);
                              if (
                                section?.gender &&
                                section.gender !== tab
                              ) {
                                toast.error('هذه الشعبة لا تطابق تبويب الجنس الحالي');
                                return;
                              }
                              updateRow(rowIndex, {
                                grade_section_id: e.target.value,
                                grade_section_name: section?.name ?? '',
                              });
                            }}
                          >
                            <option value="">بدون شعبة</option>
                            {(row.grade_id
                              ? sectionsForGrade(sections, row.grade_id, tab)
                              : sections.filter((s) => !s.gender || s.gender === tab)
                            ).map((s) => (
                              <option key={s.id} value={s.id}>
                                {sectionOptionLabel(s)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={selectCls}
                            value={row.subject_id}
                            disabled={!row.grade_id}
                            onChange={(e) =>
                              updateRow(rowIndex, { subject_id: e.target.value, teacher_id: '' })
                            }
                          >
                            <option value="">—</option>
                            {gradeSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={selectCls}
                            value={row.teacher_id}
                            disabled={!row.subject_id}
                            onChange={(e) => updateRow(rowIndex, { teacher_id: e.target.value })}
                          >
                            <option value="">
                              {row.subject_id ? '—' : 'اختر المادة أولًا'}
                            </option>
                            {teachers
                              .filter((t) =>
                                (t.staff_profile?.qualifications?.subjects ?? []).some(
                                  (s) => String(s.id) === row.subject_id,
                                ),
                              )
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={selectCls}
                            value={row.hall_id}
                            onChange={(e) => updateRow(rowIndex, { hall_id: e.target.value })}
                          >
                            <option value="">—</option>
                            {halls.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={`${selectCls} w-[76px]`}
                            value={row.day_of_week}
                            onChange={(e) => updateRow(rowIndex, { day_of_week: e.target.value })}
                          >
                            {WEEKDAYS.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="time"
                            dir="ltr"
                            className={`${selectCls} w-[92px] font-latin`}
                            value={row.start_time}
                            onChange={(e) => updateRow(rowIndex, { start_time: e.target.value })}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="time"
                            dir="ltr"
                            className={`${selectCls} w-[92px] font-latin`}
                            value={row.end_time}
                            onChange={(e) => updateRow(rowIndex, { end_time: e.target.value })}
                          />
                        </td>
                        <td className="whitespace-nowrap px-1 py-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="نسخ لنفس الصف واليوم"
                              onClick={() => duplicateRow(rowIndex)}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-gold hover:bg-cream-soft"
                            >
                              <Icon name="fa-solid fa-plus" className="text-[10px]" />
                            </button>
                            <button
                              type="button"
                              title="حذف"
                              onClick={() => void removeRow(rowIndex)}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-[#a34b4b] hover:bg-[#fdf0f0]"
                            >
                              <Icon name="fa-solid fa-xmark" className="text-[10px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {row.result?.success === false ? (
                        <tr className="bg-[#fdf0f0]">
                          <td colSpan={9} className="px-2 pb-1.5 pt-0 text-[11px] text-[#a34b4b]">
                            {row.result.error}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-cream-line px-3 py-2">
            <button
              type="button"
              onClick={addBlankRow}
              className="flex items-center gap-1.5 text-[12px] font-bold text-gold hover:underline"
            >
              <Icon name="fa-solid fa-plus" className="text-[10px]" /> إضافة سطر
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-gold"
              checked={forceAll}
              onChange={(e) => setForceAll(e.target.checked)}
            />
            تجاوز كل التعارضات
          </label>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-[13px] font-extrabold text-navy disabled:opacity-70"
          >
            <Icon name="fa-solid fa-floppy-disk" className="text-[11px]" />
            {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ التعديلات'}
          </button>
        </div>
      </AdminContent>
    </>
  );
}
