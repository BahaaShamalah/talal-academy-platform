'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  apiClient,
  qs,
  type AttendanceBoardResponse,
  type AttendanceBoardSection,
  type AttendanceBoardStudent,
  type AttendanceStatus,
  type Grade,
  type GradeSection,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STATUS_OPTIONS: {
  id: AttendanceStatus;
  label: string;
  short: string;
  active: string;
  idle: string;
}[] = [
  {
    id: 'present',
    label: 'حاضر',
    short: 'ح',
    active: 'bg-[#2e7d4f] text-white border-[#2e7d4f]',
    idle: 'bg-white text-[#2e7d4f] border-[#cfe3d5] hover:bg-[#e9f3ec]',
  },
  {
    id: 'absent',
    label: 'غائب',
    short: 'غ',
    active: 'bg-[#a34b4b] text-white border-[#a34b4b]',
    idle: 'bg-white text-[#a34b4b] border-[#efd4d4] hover:bg-[#f8ecec]',
  },
  {
    id: 'late',
    label: 'متأخر',
    short: 'ت',
    active: 'bg-[#c47a1a] text-white border-[#c47a1a]',
    idle: 'bg-white text-[#c47a1a] border-[#ead9b0] hover:bg-[#f7f0e1]',
  },
  {
    id: 'excused',
    label: 'مستأذن',
    short: 'م',
    active: 'bg-[#6b7280] text-white border-[#6b7280]',
    idle: 'bg-white text-[#6b7280] border-[#e2ddd2] hover:bg-[#f4f1ea]',
  },
];

function genderLabel(g?: string | null) {
  if (g === 'male') return 'ذكور';
  if (g === 'female') return 'إناث';
  return null;
}

type FlatRow = AttendanceBoardStudent & {
  stage_name?: string | null;
  grade_name?: string | null;
  section_name?: string | null;
  section: AttendanceBoardSection;
};

export function AttendanceHubPage() {
  const canManage = useAuthStore((s) => s.hasPermission('attendance.manage'));
  const isTeacher = useAuthStore((s) => s.hasRole('teacher') && !s.hasRole('admin'));
  const qc = useQueryClient();

  const [date, setDate] = useState(todayIso());
  const [stageId, setStageId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});

  const isFiltered = Boolean(stageId || gradeId || sectionId);

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100, include: 'educationalStage' })}`),
  });

  const sectionsQuery = useQuery({
    queryKey: ['grade-sections-attendance', gradeId],
    queryFn: () =>
      apiClient<Paginated<GradeSection>>(
        `/grade-sections${qs({
          per_page: 100,
          include: 'grade',
          'filter[grade_id]': gradeId || undefined,
        })}`,
      ),
  });

  const boardQuery = useQuery({
    queryKey: ['attendance-board', date, stageId, gradeId, sectionId],
    queryFn: () =>
      apiClient<AttendanceBoardResponse>(
        `/attendance/board${qs({
          date,
          educational_stage_id: stageId || undefined,
          grade_id: gradeId || undefined,
          grade_section_id: sectionId || undefined,
        })}`,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      grade_section_id?: number | null;
      grade_id?: number | null;
      records: { student_id: number; status: AttendanceStatus }[];
    }) =>
      apiClient<AttendanceBoardResponse>('/attendance/board', {
        method: 'POST',
        body: JSON.stringify({ date, ...payload }),
      }),
    onSuccess: () => {
      toast.success('تم حفظ الحضور');
      setMarks({});
      qc.invalidateQueries({ queryKey: ['attendance-board'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allGrades = gradesQuery.data?.data ?? [];
  const stages = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of allGrades) {
      const stage = g.educational_stage;
      if (stage) map.set(stage.id, stage.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allGrades]);
  const grades = allGrades.filter((g) => (stageId ? String(g.educational_stage_id) === stageId : true));
  const sections = sectionsQuery.data?.data ?? [];
  const board = boardQuery.data;
  const loading = boardQuery.isLoading;

  const sectionKey = (section: AttendanceBoardSection) =>
    section.group_key ?? String(section.grade_section_id ?? `g-${section.grade_id}`);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const section of board?.sections ?? []) {
      for (const student of section.students) {
        rows.push({
          ...student,
          stage_name: section.stage_name,
          grade_name: section.grade_name,
          section_name: section.grade_section_name,
          section,
        });
      }
    }
    rows.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    return rows;
  }, [board?.sections]);

  const grouped = useMemo(() => {
    const map = new Map<string, AttendanceBoardSection[]>();
    for (const section of board?.sections ?? []) {
      const heading = [section.stage_name, section.grade_name].filter(Boolean).join(' — ') || 'صف';
      const list = map.get(heading) ?? [];
      list.push(section);
      map.set(heading, list);
    }
    return [...map.entries()];
  }, [board?.sections]);

  function statusOf(student: AttendanceBoardStudent): AttendanceStatus | 'mixed' | null {
    return marks[student.id] ?? student.status ?? null;
  }

  function markStudent(studentId: number, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAll(students: AttendanceBoardStudent[], status: AttendanceStatus) {
    setMarks((prev) => {
      const next = { ...prev };
      for (const s of students) next[s.id] = status;
      return next;
    });
  }

  function buildRecords(students: AttendanceBoardStudent[]) {
    return students
      .map((s) => {
        const status = marks[s.id] ?? (s.status && s.status !== 'mixed' ? s.status : null);
        return status ? { student_id: s.id, status } : null;
      })
      .filter((row): row is { student_id: number; status: AttendanceStatus } => Boolean(row));
  }

  function saveFlat() {
    const records = buildRecords(flatRows);
    if (records.length === 0) {
      toast.error('حدّد الحضور أو الغياب أولاً');
      return;
    }
    saveMutation.mutate({ records });
  }

  function saveSection(section: AttendanceBoardSection) {
    const records = buildRecords(section.students);
    if (records.length === 0) {
      toast.error('حدّد الحضور أو الغياب أولاً');
      return;
    }
    saveMutation.mutate({
      grade_section_id: section.grade_section_id,
      grade_id: section.grade_section_id ? undefined : (section.grade_id ?? undefined),
      records,
    });
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  const markedFlat = flatRows.filter((s) => {
    const st = statusOf(s);
    return st && st !== 'mixed';
  }).length;

  return (
    <>
      <AdminHeader title="تسجيل الحضور" crumb="شؤون الطلاب ← تسجيل الحضور" />

      <AdminContent>
        <div className="mb-3 overflow-hidden rounded-[18px] border border-cream-line bg-white p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              className={`${selectCls} font-latin`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select
              className={selectCls}
              value={stageId}
              onChange={(e) => {
                setStageId(e.target.value);
                setGradeId('');
                setSectionId('');
                setMarks({});
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
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionId('');
                setMarks({});
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
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setMarks({});
              }}
            >
              <option value="">كل الشعب</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setDate(todayIso())}
              className="rounded-full border border-cream-line2 bg-white px-3.5 py-2 text-[12.5px] font-bold text-navy"
            >
              اليوم
            </button>
          </div>
          {isTeacher || board?.scoped_to_teacher ? (
            <p className="mt-2.5 text-[12.5px] text-ink-dim">تظهر لك شعبك وطلابك فقط.</p>
          ) : (
            <p className="mt-2.5 text-[12.5px] text-ink-dim">
              {isFiltered
                ? 'عرض مصنّف حسب الشعبة وفق الفلاتر المحددة.'
                : 'كل طلاب المعهد في قائمة واحدة. استخدم الفلاتر للتصنيف حسب المرحلة أو الصف أو الشعبة.'}
            </p>
          )}
        </div>

        {loading ? <TableSkeleton cols={isFiltered ? 4 : 5} /> : null}

        {!loading && flatRows.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-clipboard-user"
            title="لا يوجد طلاب"
            body="لا يوجد طلاب نشطون في المعهد ضمن الفلاتر المحددة."
          />
        ) : null}

        {!loading && flatRows.length > 0 && !isFiltered ? (
          <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] px-4 py-3">
              <div>
                <div className="text-[14.5px] font-extrabold text-navy-800">جميع الطلاب</div>
                <div className="mt-0.5 text-[12px] text-ink-dim">
                  {flatRows.length} طالب · مسجّل {markedFlat}/{flatRows.length}
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => markAll(flatRows, 'present')}
                    className="rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-3 py-1.5 text-[12px] font-bold text-[#2e7d4f]"
                  >
                    الكل حاضر
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll(flatRows, 'absent')}
                    className="rounded-full border border-[#efd4d4] bg-[#f8ecec] px-3 py-1.5 text-[12px] font-bold text-[#a34b4b]"
                  >
                    الكل غائب
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={saveFlat}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-[12px] font-extrabold text-navy disabled:opacity-60"
                  >
                    {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ الحضور'}
                  </button>
                </div>
              ) : null}
            </div>
            <FlatStudentsTable
              rows={flatRows}
              canManage={canManage}
              statusOf={statusOf}
              onMark={markStudent}
            />
          </div>
        ) : null}

        {!loading && flatRows.length > 0 && isFiltered
          ? grouped.map(([heading, sectionList]) => (
              <div key={heading} className="mb-4 space-y-3">
                <h2 className="px-1 text-[14px] font-extrabold text-navy-800">{heading}</h2>
                {sectionList.map((section) => (
                  <SectionCard
                    key={sectionKey(section)}
                    section={section}
                    canManage={canManage}
                    saving={saveMutation.isPending}
                    statusOf={(id) => {
                      const student = section.students.find((s) => s.id === id);
                      return student ? statusOf(student) : null;
                    }}
                    onMark={markStudent}
                    onMarkAll={(status) => markAll(section.students, status)}
                    onSave={() => saveSection(section)}
                  />
                ))}
              </div>
            ))
          : null}
      </AdminContent>
    </>
  );
}

function StatusButtons({
  status,
  canManage,
  onMark,
}: {
  status: AttendanceStatus | 'mixed' | null;
  canManage: boolean;
  onMark: (status: AttendanceStatus) => void;
}) {
  if (!canManage) {
    return (
      <span className="text-[12.5px] font-bold text-ink-soft">
        {STATUS_OPTIONS.find((o) => o.id === status)?.label ??
          (status === 'mixed' ? 'متفاوت' : '—')}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onMark(opt.id)}
          className={`h-8 min-w-8 rounded-full border px-2 text-[12px] font-extrabold ${
            status === opt.id ? opt.active : opt.idle
          }`}
          title={opt.label}
        >
          {opt.short}
        </button>
      ))}
      {status === 'mixed' ? (
        <span className="self-center text-[11px] font-bold text-[#8a6a20]">متفاوت</span>
      ) : null}
    </div>
  );
}

function FlatStudentsTable({
  rows,
  canManage,
  statusOf,
  onMark,
}: {
  rows: FlatRow[];
  canManage: boolean;
  statusOf: (student: AttendanceBoardStudent) => AttendanceStatus | 'mixed' | null;
  onMark: (studentId: number, status: AttendanceStatus) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse">
        <thead>
          <tr className="bg-cream-soft">
            {['الطالب', 'رقم الملف', 'المرحلة', 'الصف', 'الشعبة', 'الحضور'].map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((student) => (
            <tr key={student.id} className="border-t border-[#f4f1ea]">
              <td className="px-4 py-2.5 text-[13.5px] font-bold text-ink">{student.full_name}</td>
              <td className="font-latin whitespace-nowrap px-4 py-2.5 text-[12.5px] text-ink-soft">
                {student.file_number}
              </td>
              <td className="px-4 py-2.5 text-[12.5px] text-ink-soft">{student.stage_name || '—'}</td>
              <td className="px-4 py-2.5 text-[12.5px] text-ink-soft">{student.grade_name || '—'}</td>
              <td className="px-4 py-2.5 text-[12.5px] text-ink-dim">
                {student.section_name && student.section_name !== 'بدون شعبة'
                  ? student.section_name
                  : '—'}
              </td>
              <td className="px-4 py-2.5">
                <StatusButtons
                  status={statusOf(student)}
                  canManage={canManage}
                  onMark={(status) => onMark(student.id, status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({
  section,
  canManage,
  saving,
  statusOf,
  onMark,
  onMarkAll,
  onSave,
}: {
  section: AttendanceBoardSection;
  canManage: boolean;
  saving: boolean;
  statusOf: (studentId: number) => AttendanceStatus | 'mixed' | null;
  onMark: (studentId: number, status: AttendanceStatus) => void;
  onMarkAll: (status: AttendanceStatus) => void;
  onSave: () => void;
}) {
  const gender = genderLabel(section.gender);
  const marked = section.students.filter((s) => {
    const st = statusOf(s.id);
    return st && st !== 'mixed';
  }).length;

  return (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] px-4 py-3">
        <div>
          <div className="text-[14.5px] font-extrabold text-navy-800">
            {section.grade_section_name}
            {gender ? <span className="me-2 text-[12.5px] font-bold text-ink-dim"> · {gender}</span> : null}
          </div>
          <div className="mt-0.5 text-[12px] text-ink-dim">
            {section.students.length} طالب
            {section.subjects.length ? ` · ${section.subjects.join('، ')}` : ''}
            {` · مسجّل ${marked}/${section.students.length}`}
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMarkAll('present')}
              className="rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-3 py-1.5 text-[12px] font-bold text-[#2e7d4f]"
            >
              الكل حاضر
            </button>
            <button
              type="button"
              onClick={() => onMarkAll('absent')}
              className="rounded-full border border-[#efd4d4] bg-[#f8ecec] px-3 py-1.5 text-[12px] font-bold text-[#a34b4b]"
            >
              الكل غائب
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-[12px] font-extrabold text-navy disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ…' : 'حفظ الحضور'}
            </button>
          </div>
        ) : null}
      </div>

      {section.students.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-ink-dim">لا طلاب مسجّلين في هذه الشعبة.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-cream-soft">
                {['الطالب', 'رقم الملف', 'الحصص اليوم', 'الحضور'].map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.students.map((student) => (
                <tr key={student.id} className="border-t border-[#f4f1ea]">
                  <td className="px-4 py-2.5 text-[13.5px] font-bold text-ink">{student.full_name}</td>
                  <td className="font-latin whitespace-nowrap px-4 py-2.5 text-[12.5px] text-ink-soft">
                    {student.file_number}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-ink-dim">
                    {student.sessions.length
                      ? student.sessions.map((s) => s.subject_name).filter(Boolean).join('، ')
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusButtons
                      status={statusOf(student.id)}
                      canManage={canManage}
                      onMark={(status) => onMark(student.id, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
