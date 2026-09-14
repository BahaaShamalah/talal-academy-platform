'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { CreateOfferingWithScheduleModal } from '@/components/academic-structure/create-offering-with-schedule-modal';
import { EditOfferingModal } from '@/components/academic-structure/edit-offering-modal';
import { EditScheduleModal } from '@/components/academic-structure/edit-schedule-modal';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
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
  type ClassOffering,
  type ClassOfferingGender,
  type ClassSchedule,
  type EducationalStage,
  type Grade,
  type GradeSection,
  type InstituteSetting,
  type Paginated,
  type Student,
  type Subject,
} from '@/lib/api-client';
import { deleteClassSchedule } from '@/lib/class-schedules-api';
import { openPrintPreviewWindow } from '@/lib/print/print-utils';
import { openScheduleExport, printOfficialScheduleExport, type ScheduleExportFilters } from '@/lib/schedule-export';
import { formatScheduleSlot } from '@/lib/weekdays';
import { useAuthStore } from '@/stores/auth-store';

type Level = 1 | 2 | 3 | 4;

type Drill = {
  level: Level;
  stageId: number | null;
  stageName: string;
  gradeId: number | null;
  gradeName: string;
  sectionId: number | null;
  sectionName: string;
  subjectId: number | null;
  subjectName: string;
};

const ROOT_DRILL: Drill = {
  level: 1,
  stageId: null,
  stageName: '',
  gradeId: null,
  gradeName: '',
  sectionId: null,
  sectionName: '',
  subjectId: null,
  subjectName: '',
};

type StageForm = { name: string; order: string };
type GradeForm = { name: string; order: string };
type SectionForm = { name: string; gender: '' | ClassOfferingGender; capacity: string };

const emptyStageForm: StageForm = { name: '', order: '0' };
const emptyGradeForm: GradeForm = { name: '', order: '0' };
const emptySectionForm: SectionForm = { name: '', gender: '', capacity: '' };

function ExportButtons({ filters }: { filters: ScheduleExportFilters }) {
  const [printing, setPrinting] = useState(false);

  const instituteQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: () => apiClient<InstituteSetting>('/settings/institute'),
    staleTime: 60_000,
  });

  async function handlePrint() {
    let preview: Window | null = null;
    try {
      preview = openPrintPreviewWindow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
      return;
    }

    setPrinting(true);
    try {
      await printOfficialScheduleExport({
        filters,
        institute: instituteQuery.data,
        targetWindow: preview,
      });
    } catch (err) {
      try {
        preview.close();
      } catch {
        /* ignore */
      }
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => openScheduleExport(filters, 'download')}
        className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-ink-soft transition-colors hover:border-gold/40 hover:text-ink"
      >
        <Icon name="fa-solid fa-file-pdf" className="text-[11px] text-gold" />
        تصدير PDF
      </button>
      <button
        type="button"
        disabled={printing}
        onClick={() => void handlePrint()}
        className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-ink-soft transition-colors hover:border-gold/40 hover:text-ink disabled:opacity-50"
      >
        <Icon name="fa-solid fa-print" className="text-[11px]" />
        {printing ? 'جاري التحضير…' : 'طباعة'}
      </button>
    </div>
  );
}

const PAGE_TITLE = 'إدارة المراحل والجداول';

const LEVEL_HINTS: Record<Level, string> = {
  1: 'اختر مرحلة تعليمية للمتابعة',
  2: 'اختر صفًا داخل المرحلة',
  3: 'اختر شعبة ثم مادة — تظهر أسماء طلاب الشعبة مباشرة',
  4: 'طلاب الشعبة وجداول المادة',
};

function PrimaryButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
    >
      {icon ? <Icon name={icon} className="text-[11px]" /> : null}
      {children}
    </button>
  );
}

function PagePanel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white shadow-[0_10px_30px_-24px_rgba(0,0,0,.18)]">
      {children}
    </div>
  );
}

function LevelToolbar({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece1] px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-dim">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function DrillCard({
  title,
  subtitle,
  icon,
  onClick,
  actions,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-[16px] border border-cream-line bg-white p-4 text-right transition-all hover:-translate-y-px hover:border-gold/35 hover:bg-cream-soft/30 hover:shadow-[0_12px_28px_-20px_rgba(200,162,74,.35)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cream-soft to-white text-gold ring-1 ring-cream-line">
          <Icon name={icon} className="text-[16px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-bold text-ink">{title}</div>
          <div className="mt-0.5 text-[12px] text-ink-dim">{subtitle}</div>
        </div>
        <Icon
          name="fa-solid fa-chevron-left"
          className="shrink-0 text-[11px] text-ink-faint transition-transform group-hover:-translate-x-0.5 group-hover:text-gold"
        />
      </button>
      {actions ? (
        <div className="absolute left-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function CardAction({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: string;
  onClick: (e: MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-white/95 shadow-sm ${
        danger ? 'border-[#f2dede] text-[#a34b4b]' : 'border-cream-line text-ink-soft'
      }`}
    >
      <Icon name={icon} className="text-[10px]" />
    </button>
  );
}

function Breadcrumb({
  parts,
  onNavigate,
  onBack,
}: {
  parts: { label: string; level: Level }[];
  onNavigate: (level: Level) => void;
  onBack?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 items-center gap-1.5 rounded-full border border-cream-line bg-white px-3 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-gold/40 hover:text-ink"
        >
          <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
          رجوع
        </button>
      ) : null}
      <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-full border border-cream-line bg-white px-3.5 py-2 text-[12.5px] text-ink-dim">
        {parts.map((part, i) => (
          <span key={`${part.level}-${part.label}`} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-ink-faint">›</span> : null}
            {i < parts.length - 1 ? (
              <button
                type="button"
                onClick={() => onNavigate(part.level)}
                className="font-semibold text-gold hover:underline"
              >
                {part.label}
              </button>
            ) : (
              <span className="font-bold text-ink">{part.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function AcademicStructurePage() {
  const qc = useQueryClient();
  const canManageStages = useAuthStore((s) => s.hasPermission('stages.manage'));
  const canManageGrades = useAuthStore((s) => s.hasPermission('grades.manage'));
  const canManageSubjects = useAuthStore((s) => s.hasPermission('subjects.manage'));
  const canManageOfferings = useAuthStore((s) => s.hasPermission('course-groups.manage'));
  const canViewOfferings = useAuthStore((s) => s.hasPermission('course-groups.view'));
  const canManageSchedules = useAuthStore((s) => s.hasPermission('class-schedules.manage'));
  const canViewEnrollments = useAuthStore((s) => s.hasPermission('enrollments.view'));
  const canViewStudents = useAuthStore((s) => s.hasPermission('students.view'));
  const canViewSectionStudents = canViewOfferings || canViewEnrollments || canViewStudents;

  const [drill, setDrill] = useState<Drill>(ROOT_DRILL);
  const [createOfferingOpen, setCreateOfferingOpen] = useState(false);
  const [createOfferingGender, setCreateOfferingGender] = useState<ClassOfferingGender>('male');
  const [editOfferingTarget, setEditOfferingTarget] = useState<ClassOffering | null>(null);
  const [deleteOfferingTarget, setDeleteOfferingTarget] = useState<ClassOffering | null>(null);
  const [editScheduleTarget, setEditScheduleTarget] = useState<ClassSchedule | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ClassSchedule | null>(null);

  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<EducationalStage | null>(null);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);
  const [deleteStageTarget, setDeleteStageTarget] = useState<EducationalStage | null>(null);

  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState<GradeForm>(emptyGradeForm);
  const [deleteGradeTarget, setDeleteGradeTarget] = useState<Grade | null>(null);

  const [linkSubjectOpen, setLinkSubjectOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [detachSubjectTarget, setDetachSubjectTarget] = useState<Subject | null>(null);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<GradeSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<GradeSection | null>(null);

  const stagesQuery = useQuery({
    queryKey: ['educational-stages'],
    queryFn: () =>
      apiClient<Paginated<EducationalStage>>(`/educational-stages${qs({ per_page: 100 })}`),
    enabled: drill.level >= 1,
  });

  const gradesQuery = useQuery({
    queryKey: ['grades', drill.stageId],
    queryFn: () =>
      apiClient<Paginated<Grade>>(
        `/grades${qs({
          include: 'educationalStage,subjects',
          per_page: 100,
          'filter[educational_stage_id]': drill.stageId ?? undefined,
        })}`,
      ),
    enabled: drill.level >= 2 && drill.stageId != null,
  });

  const gradeDetailQuery = useQuery({
    queryKey: ['grade-detail', drill.gradeId],
    queryFn: () =>
      apiClient<Grade>(`/grades/${drill.gradeId}${qs({ include: 'subjects,educationalStage' })}`),
    enabled: drill.level >= 3 && drill.gradeId != null,
  });

  const sectionsQuery = useQuery({
    queryKey: ['grade-sections', drill.gradeId],
    queryFn: () =>
      apiClient<Paginated<GradeSection>>(
        `/grade-sections${qs({
          per_page: 100,
          'filter[grade_id]': drill.gradeId ?? undefined,
          include: 'grade',
        })}`,
      ),
    enabled: drill.level >= 3 && drill.gradeId != null,
  });

  const allSubjectsQuery = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 200 })}`),
    enabled: linkSubjectOpen || createSubjectOpen,
  });

  const offeringsQuery = useQuery({
    queryKey: ['class-offerings', drill.gradeId, drill.sectionId, drill.subjectId],
    queryFn: () =>
      apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({
          include: 'grade,gradeSection,subject,teacher,hall,period,schedules',
          per_page: 100,
          'filter[grade_id]': drill.gradeId ?? undefined,
          'filter[grade_section_id]': drill.sectionId ?? undefined,
          'filter[subject_id]': drill.subjectId ?? undefined,
        })}`,
      ),
    enabled:
      drill.level === 4 &&
      drill.gradeId != null &&
      drill.sectionId != null &&
      drill.subjectId != null,
  });

  const offeringsForGradeQuery = useQuery({
    queryKey: ['class-offerings-grade', drill.gradeId, drill.sectionId],
    queryFn: () =>
      apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({
          per_page: 200,
          'filter[grade_id]': drill.gradeId ?? undefined,
          'filter[grade_section_id]': drill.sectionId ?? undefined,
        })}`,
      ),
    enabled: drill.level === 3 && drill.gradeId != null && drill.sectionId != null,
  });

  const sectionStudentsQuery = useQuery({
    queryKey: ['grade-section-students', drill.sectionId],
    queryFn: () =>
      apiClient<Paginated<Student>>(`/grade-sections/${drill.sectionId}/students`),
    enabled: drill.level >= 3 && drill.sectionId != null && canViewSectionStudents,
  });

  const stages = stagesQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];
  const gradeDetail = gradeDetailQuery.data;
  const gradeSections = sectionsQuery.data?.data ?? [];
  const linkedSubjects = gradeDetail?.subjects ?? [];
  const allSubjects = allSubjectsQuery.data?.data ?? [];
  const offerings = offeringsQuery.data?.data ?? [];
  const sectionStudents = sectionStudentsQuery.data?.data ?? [];

  const offeringCountBySubject = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of offeringsForGradeQuery.data?.data ?? []) {
      map.set(o.subject_id, (map.get(o.subject_id) ?? 0) + 1);
    }
    return map;
  }, [offeringsForGradeQuery.data?.data]);

  const selectedSection = useMemo(
    () => gradeSections.find((s) => s.id === drill.sectionId) ?? null,
    [gradeSections, drill.sectionId],
  );

  const sectionGender: ClassOfferingGender =
    selectedSection?.gender === 'female' ? 'female' : 'male';

  useEffect(() => {
    if (drill.level < 3) return;
    if (drill.sectionId != null) return;
    if (!sectionsQuery.isSuccess) return;
    const first = sectionsQuery.data?.data?.[0];
    if (!first) return;
    setDrill((prev) => ({
      ...prev,
      sectionId: first.id,
      sectionName: first.name,
    }));
  }, [drill.level, drill.sectionId, sectionsQuery.isSuccess, sectionsQuery.data?.data]);

  const breadcrumbParts = useMemo(() => {
    const parts: { label: string; level: Level }[] = [{ label: PAGE_TITLE, level: 1 }];
    if (drill.level >= 2 && drill.stageName) {
      parts.push({ label: drill.stageName, level: 2 });
    }
    if (drill.level >= 3 && drill.gradeName) {
      parts.push({ label: drill.gradeName, level: 3 });
    }
    if (drill.level >= 3 && drill.sectionName) {
      parts.push({ label: drill.sectionName, level: 3 });
    }
    if (drill.level >= 4 && drill.subjectName) {
      parts.push({ label: drill.subjectName, level: 4 });
    }
    return parts;
  }, [drill]);

  function navigateTo(level: Level) {
    setDrill((prev) => {
      if (level === 1) return ROOT_DRILL;
      if (level === 2) {
        return {
          ...prev,
          level: 2,
          gradeId: null,
          gradeName: '',
          sectionId: null,
          sectionName: '',
          subjectId: null,
          subjectName: '',
        };
      }
      if (level === 3) {
        return {
          ...prev,
          level: 3,
          subjectId: null,
          subjectName: '',
        };
      }
      return prev;
    });
  }

  const saveStageMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: stageForm.name.trim(), order: Number(stageForm.order) || 0 };
      if (editingStage) {
        return apiClient(`/educational-stages/${editingStage.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/educational-stages', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editingStage ? 'تم تحديث المرحلة' : 'تم إضافة المرحلة');
      setStageModalOpen(false);
      setEditingStage(null);
      setStageForm(emptyStageForm);
      qc.invalidateQueries({ queryKey: ['educational-stages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/educational-stages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المرحلة');
      setDeleteStageTarget(null);
      qc.invalidateQueries({ queryKey: ['educational-stages'] });
      if (deleteStageTarget && drill.stageId === deleteStageTarget.id) navigateTo(1);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveGradeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: gradeForm.name.trim(),
        educational_stage_id: drill.stageId,
        order: Number(gradeForm.order) || 0,
      };
      if (editingGrade) {
        return apiClient(`/grades/${editingGrade.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/grades', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editingGrade ? 'تم تحديث الصف' : 'تم إضافة الصف');
      setGradeModalOpen(false);
      setEditingGrade(null);
      setGradeForm(emptyGradeForm);
      qc.invalidateQueries({ queryKey: ['grades'] });
      qc.invalidateQueries({ queryKey: ['grade-detail'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/grades/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الصف');
      setDeleteGradeTarget(null);
      qc.invalidateQueries({ queryKey: ['grades'] });
      if (deleteGradeTarget && drill.gradeId === deleteGradeTarget.id) navigateTo(2);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSectionMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        grade_id: drill.gradeId,
        name: sectionForm.name.trim(),
        status: 'active',
      };
      if (sectionForm.gender) payload.gender = sectionForm.gender;
      if (sectionForm.capacity.trim()) payload.capacity = Number(sectionForm.capacity);

      if (editingSection) {
        return apiClient(`/grade-sections/${editingSection.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/grade-sections', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editingSection ? 'تم تحديث الشعبة' : 'تم إضافة الشعبة');
      setSectionModalOpen(false);
      setEditingSection(null);
      setSectionForm(emptySectionForm);
      qc.invalidateQueries({ queryKey: ['grade-sections'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/grade-sections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الشعبة');
      setDeleteSectionTarget(null);
      qc.invalidateQueries({ queryKey: ['grade-sections'] });
      if (deleteSectionTarget && drill.sectionId === deleteSectionTarget.id) {
        const remaining = (sectionsQuery.data?.data ?? []).filter(
          (s) => s.id !== deleteSectionTarget.id,
        );
        const next = remaining[0];
        setDrill((prev) => ({
          ...prev,
          level: 3,
          sectionId: next?.id ?? null,
          sectionName: next?.name ?? '',
          subjectId: null,
          subjectName: '',
        }));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const linkSubjectMutation = useMutation({
    mutationFn: (subjectId: number) =>
      apiClient(`/grades/${drill.gradeId}/subjects/${subjectId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('تم ربط المادة');
      qc.invalidateQueries({ queryKey: ['grade-detail'] });
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const detachSubjectMutation = useMutation({
    mutationFn: (subjectId: number) =>
      apiClient(`/grades/${drill.gradeId}/subjects/${subjectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم إلغاء ربط المادة');
      setDetachSubjectTarget(null);
      qc.invalidateQueries({ queryKey: ['grade-detail'] });
      qc.invalidateQueries({ queryKey: ['grades'] });
      if (detachSubjectTarget && drill.subjectId === detachSubjectTarget.id) navigateTo(3);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const subject = await apiClient<Subject>('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      await apiClient(`/grades/${drill.gradeId}/subjects/${subject.id}`, { method: 'POST' });
      return subject;
    },
    onSuccess: () => {
      toast.success('تم إنشاء المادة وربطها');
      setCreateSubjectOpen(false);
      setNewSubjectName('');
      qc.invalidateQueries({ queryKey: ['subjects-all'] });
      qc.invalidateQueries({ queryKey: ['grade-detail'] });
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unlinkedSubjects = allSubjects.filter(
    (s) => !linkedSubjects.some((ls) => ls.id === s.id),
  );

  const exportFilters = useMemo((): ScheduleExportFilters => {
    if (drill.sectionId == null) {
      if (drill.level >= 3 && drill.gradeId) {
        return { grade_id: drill.gradeId };
      }
      return {};
    }

    if (drill.level >= 4 && drill.gradeId && drill.subjectId) {
      return {
        grade_id: drill.gradeId,
        subject_id: drill.subjectId,
        grade_section_id: drill.sectionId,
      };
    }
    if (drill.level >= 3 && drill.gradeId) {
      return { grade_id: drill.gradeId, grade_section_id: drill.sectionId };
    }
    return {};
  }, [drill.level, drill.gradeId, drill.sectionId, drill.subjectId]);

  const deleteOfferingMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/class-offerings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الجدول');
      setDeleteOfferingTarget(null);
      qc.invalidateQueries({ queryKey: ['class-offerings'] });
      qc.invalidateQueries({ queryKey: ['class-offerings-grade'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => deleteClassSchedule(id),
    onSuccess: () => {
      toast.success('تم حذف الموعد');
      setDeleteScheduleTarget(null);
      qc.invalidateQueries({ queryKey: ['class-offerings'] });
      qc.invalidateQueries({ queryKey: ['class-offerings-grade'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function invalidateOfferings() {
    qc.invalidateQueries({ queryKey: ['class-offerings'] });
    qc.invalidateQueries({ queryKey: ['class-offerings-grade'] });
  }

  function openCreateOffering(gender: ClassOfferingGender) {
    setCreateOfferingGender(gender);
    setCreateOfferingOpen(true);
  }

  function renderSectionStudentsBlock() {
    if (!canViewSectionStudents || drill.sectionId == null) return null;

    return (
      <div>
        <p className="mb-3 text-[12px] font-bold text-ink-dim">
          طلاب {drill.sectionName || 'الشعبة'}
          {sectionStudents.length > 0 ? (
            <span className="font-latin ms-2 text-ink-faint">({sectionStudents.length})</span>
          ) : null}
        </p>
        {sectionStudentsQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-cream-soft" />
        ) : sectionStudentsQuery.isError ? (
          <div className="rounded-xl border border-dashed border-[#efd4d4] bg-[#fdf0f0] px-4 py-6 text-center">
            <p className="text-[13px] text-[#a34b4b]">تعذّر تحميل طلاب الشعبة.</p>
          </div>
        ) : sectionStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-cream-line2 bg-cream-soft/30 px-4 py-6 text-center">
            <p className="text-[13px] text-ink-dim">لا يوجد طلاب مسجّلون في هذه الشعبة بعد.</p>
          </div>
        ) : (
          <ul className="divide-y divide-cream-line overflow-hidden rounded-[14px] border border-cream-line bg-cream-soft/20">
            {sectionStudents.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
              >
                <span className="font-semibold text-ink">{student.full_name}</span>
                {student.file_number ? (
                  <span className="font-latin text-[11px] text-ink-faint">{student.file_number}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function renderOfferingList(list: ClassOffering[]) {
    if (list.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-cream-line2 bg-cream-soft/30 px-4 py-8 text-center">
          <Icon name="fa-solid fa-calendar-xmark" className="mb-2 text-[20px] text-ink-faint" />
          <p className="text-[13px] text-ink-dim">لا توجد جداول في هذا القسم بعد.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {list.map((offering) => (
          <div
            key={offering.id}
            className="rounded-[14px] border border-cream-line bg-cream-soft/20 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gold ring-1 ring-cream-line">
                  <Icon name="fa-solid fa-chalkboard-user" className="text-[13px]" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-ink">
                    {offering.teacher?.name ?? `معلم #${offering.teacher_id}`}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-dim">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="fa-solid fa-door-open" className="text-[10px]" />
                      {offering.hall?.name ?? `قاعة #${offering.hall_id}`}
                    </span>
                    {offering.period?.name ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="fa-solid fa-calendar" className="text-[10px]" />
                        {offering.period.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-white px-3 py-1 text-[11.5px] font-bold text-navy ring-1 ring-cream-line">
                  {offering.active_students_count ?? 0} طالب
                </div>
                {canManageOfferings ? (
                  <>
                    <button
                      type="button"
                      aria-label="تعديل الجدول"
                      onClick={() => setEditOfferingTarget(offering)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-line bg-white text-ink-soft"
                    >
                      <Icon name="fa-solid fa-pen" className="text-[10px]" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف الجدول"
                      onClick={() => setDeleteOfferingTarget(offering)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dede] bg-white text-[#a34b4b]"
                    >
                      <Icon name="fa-solid fa-trash" className="text-[10px]" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {(offering.schedules ?? []).length > 0 ? (
              <div className="mt-3 space-y-2 border-t border-cream-line pt-3">
                {(offering.schedules ?? []).map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-cream-line"
                  >
                    <span
                      className="font-latin inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-soft"
                      dir="ltr"
                    >
                      <Icon name="fa-regular fa-clock" className="text-[9px]" />
                      {formatScheduleSlot(s.day_of_week, s.start_time, s.end_time)}
                    </span>
                    {canManageSchedules ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label="تعديل الموعد"
                          onClick={() => setEditScheduleTarget(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-cream-line text-ink-soft"
                        >
                          <Icon name="fa-solid fa-pen" className="text-[9px]" />
                        </button>
                        <button
                          type="button"
                          aria-label="حذف الموعد"
                          onClick={() => setDeleteScheduleTarget(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#f2dede] text-[#a34b4b]"
                        >
                          <Icon name="fa-solid fa-trash" className="text-[9px]" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 border-t border-cream-line pt-3 text-[11.5px] font-semibold text-[#a34b4b]">
                بدون مواعيد أسبوعية
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  const headerTitle =
    drill.level === 1
      ? PAGE_TITLE
      : drill.level === 2
        ? drill.stageName
        : drill.level === 3
          ? drill.gradeName
          : drill.subjectName;

  const headerCrumb = breadcrumbParts.map((p) => p.label).join(' ← ');

  function handleBack() {
    if (drill.level === 4) navigateTo(3);
    else if (drill.level === 3) navigateTo(2);
    else if (drill.level === 2) navigateTo(1);
  }

  return (
    <>
      <AdminHeader title={headerTitle} crumb={drill.level > 1 ? headerCrumb : undefined} />

      <AdminContent>
        <Breadcrumb
          parts={breadcrumbParts}
          onNavigate={navigateTo}
          onBack={drill.level > 1 ? handleBack : undefined}
        />

        {drill.level === 1 ? (
          <PagePanel>
            <LevelToolbar
              title="المراحل التعليمية"
              hint={LEVEL_HINTS[1]}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {canViewOfferings ? <ExportButtons filters={{}} /> : null}
                  {canManageStages ? (
                    <PrimaryButton
                      icon="fa-solid fa-plus"
                      onClick={() => {
                        setEditingStage(null);
                        setStageForm(emptyStageForm);
                        setStageModalOpen(true);
                      }}
                    >
                      إضافة مرحلة
                    </PrimaryButton>
                  ) : null}
                </div>
              }
            />
            <div className="p-4 sm:p-5">
              {stagesQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[76px] animate-pulse rounded-[16px] bg-cream-soft" />
                  ))}
                </div>
              ) : stages.length === 0 ? (
                <EmptyState
                  icon="fa-solid fa-stairs"
                  title="لا توجد مراحل"
                  body="أضف المراحل التعليمية للبدء."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stages.map((stage) => (
                    <DrillCard
                      key={stage.id}
                      title={stage.name}
                      subtitle={`${stage.grades_count ?? 0} صف`}
                      icon="fa-solid fa-stairs"
                      onClick={() =>
                        setDrill({
                          level: 2,
                          stageId: stage.id,
                          stageName: stage.name,
                          gradeId: null,
                          gradeName: '',
                          sectionId: null,
                          sectionName: '',
                          subjectId: null,
                          subjectName: '',
                        })
                      }
                      actions={
                        canManageStages ? (
                          <>
                            <CardAction
                              label="تعديل"
                              icon="fa-solid fa-pen"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStage(stage);
                                setStageForm({ name: stage.name, order: String(stage.order ?? 0) });
                                setStageModalOpen(true);
                              }}
                            />
                            <CardAction
                              label="حذف"
                              icon="fa-solid fa-trash"
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteStageTarget(stage);
                              }}
                            />
                          </>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </PagePanel>
        ) : null}

        {drill.level === 2 ? (
          <PagePanel>
            <LevelToolbar
              title={`صفوف ${drill.stageName}`}
              hint={LEVEL_HINTS[2]}
              action={
                canManageGrades ? (
                  <PrimaryButton
                    icon="fa-solid fa-plus"
                    onClick={() => {
                      setEditingGrade(null);
                      setGradeForm(emptyGradeForm);
                      setGradeModalOpen(true);
                    }}
                  >
                    إضافة صف
                  </PrimaryButton>
                ) : undefined
              }
            />
            <div className="p-4 sm:p-5">
              {gradesQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[76px] animate-pulse rounded-[16px] bg-cream-soft" />
                  ))}
                </div>
              ) : grades.length === 0 ? (
                <EmptyState icon="fa-solid fa-school" title="لا توجد صفوف" body="أضف صفًا لهذه المرحلة." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grades.map((grade) => (
                    <DrillCard
                      key={grade.id}
                      title={grade.name}
                      subtitle={`${grade.subjects_count ?? grade.subjects?.length ?? 0} مادة`}
                      icon="fa-solid fa-school"
                      onClick={() =>
                        setDrill((prev) => ({
                          ...prev,
                          level: 3,
                          gradeId: grade.id,
                          gradeName: grade.name,
                          sectionId: null,
                          sectionName: '',
                          subjectId: null,
                          subjectName: '',
                        }))
                      }
                      actions={
                        canManageGrades ? (
                          <>
                            <CardAction
                              label="تعديل"
                              icon="fa-solid fa-pen"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGrade(grade);
                                setGradeForm({ name: grade.name, order: String(grade.order ?? 0) });
                                setGradeModalOpen(true);
                              }}
                            />
                            <CardAction
                              label="حذف"
                              icon="fa-solid fa-trash"
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteGradeTarget(grade);
                              }}
                            />
                          </>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </PagePanel>
        ) : null}

        {drill.level === 3 ? (
          <PagePanel>
            <LevelToolbar
              title={`${drill.gradeName} — الشعب والمواد`}
              hint={LEVEL_HINTS[3]}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {canManageOfferings ? (
                    <PrimaryButton
                      icon="fa-solid fa-plus"
                      onClick={() => {
                        setEditingSection(null);
                        setSectionForm(emptySectionForm);
                        setSectionModalOpen(true);
                      }}
                    >
                      إضافة شعبة
                    </PrimaryButton>
                  ) : null}
                  {canViewOfferings && drill.gradeId ? (
                    <ExportButtons filters={exportFilters} />
                  ) : null}
                  {canManageSubjects ? (
                    <PrimaryButton icon="fa-solid fa-link" onClick={() => setLinkSubjectOpen(true)}>
                      ربط مادة
                    </PrimaryButton>
                  ) : null}
                </div>
              }
            />
            <div className="space-y-6 p-4 sm:p-5">
              <div>
                <p className="mb-3 text-[12px] font-bold text-ink-dim">اختر الشعبة</p>
                {sectionsQuery.isLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-cream-soft" />
                    ))}
                  </div>
                ) : gradeSections.length === 0 ? (
                  <EmptyState
                    icon="fa-solid fa-layer-group"
                    title="لا توجد شعب"
                    body="أضف شعبة لهذا الصف قبل إدارة المواد والجداول."
                    primary={
                      canManageOfferings
                        ? {
                            label: 'إضافة شعبة',
                            onClick: () => {
                              setEditingSection(null);
                              setSectionForm(emptySectionForm);
                              setSectionModalOpen(true);
                            },
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {gradeSections.map((section) => (
                      <div key={section.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDrill((prev) => ({
                              ...prev,
                              sectionId: section.id,
                              sectionName: section.name,
                              subjectId: null,
                              subjectName: '',
                            }))
                          }
                          className={`rounded-full border px-4 py-2 text-[12.5px] font-bold transition ${
                            drill.sectionId === section.id
                              ? 'border-navy bg-navy text-gold'
                              : 'border-cream-line bg-white text-ink-soft hover:border-gold'
                          }`}
                        >
                          {section.name}
                          {section.gender === 'male'
                            ? ' (ذكور)'
                            : section.gender === 'female'
                              ? ' (إناث)'
                              : ''}
                        </button>
                        {canManageOfferings ? (
                          <>
                            <button
                              type="button"
                              title="تعديل"
                              onClick={() => {
                                setEditingSection(section);
                                setSectionForm({
                                  name: section.name,
                                  gender: section.gender ?? '',
                                  capacity: section.capacity != null ? String(section.capacity) : '',
                                });
                                setSectionModalOpen(true);
                              }}
                              className="rounded-full p-2 text-ink-dim hover:bg-cream-soft hover:text-navy"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              title="حذف"
                              onClick={() => setDeleteSectionTarget(section)}
                              className="rounded-full p-2 text-ink-dim hover:bg-[#fdf0f0] hover:text-[#a34b4b]"
                            >
                              <Icon name="fa-solid fa-trash" className="text-[11px]" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {drill.sectionId != null ? (
              <div className="space-y-6">
                {renderSectionStudentsBlock()}
              <div>
                <p className="mb-3 text-[12px] font-bold text-ink-dim">
                  مواد {drill.sectionName}
                </p>
              {gradeDetailQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[76px] animate-pulse rounded-[16px] bg-cream-soft" />
                  ))}
                </div>
              ) : linkedSubjects.length === 0 ? (
                <EmptyState
                  icon="fa-solid fa-book"
                  title="لا توجد مواد مرتبطة"
                  body="اربط موادًا من الكتالوج أو أنشئ مادة جديدة."
                  primary={
                    canManageSubjects
                      ? { label: 'ربط مادة', onClick: () => setLinkSubjectOpen(true) }
                      : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {linkedSubjects.map((subject) => (
                    <DrillCard
                      key={subject.id}
                      title={subject.name}
                      subtitle={`${offeringCountBySubject.get(subject.id) ?? 0} جدول`}
                      icon="fa-solid fa-book"
                      onClick={() =>
                        setDrill((prev) => ({
                          ...prev,
                          level: 4,
                          subjectId: subject.id,
                          subjectName: subject.name,
                        }))
                      }
                      actions={
                        canManageSubjects ? (
                          <CardAction
                            label="إلغاء الربط"
                            icon="fa-solid fa-unlink"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetachSubjectTarget(subject);
                            }}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
              </div>
              </div>
              ) : null}
            </div>
          </PagePanel>
        ) : null}

        {drill.level === 4 ? (
          <PagePanel>
            <LevelToolbar
              title={`جداول ${drill.subjectName}${drill.sectionName ? ` — ${drill.sectionName}` : ''}`}
              hint={LEVEL_HINTS[4]}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {canViewOfferings ? <ExportButtons filters={exportFilters} /> : null}
                  {canManageOfferings && drill.sectionId != null ? (
                    <PrimaryButton
                      icon="fa-solid fa-plus"
                      onClick={() => openCreateOffering(sectionGender)}
                    >
                      إضافة جدول
                    </PrimaryButton>
                  ) : null}
                </div>
              }
            />
            <div className="space-y-5 p-4 sm:p-5">
              {renderSectionStudentsBlock()}

              <div>
                <p className="mb-3 text-[12px] font-bold text-ink-dim">جداول المادة</p>
                {offeringsQuery.isLoading ? (
                  <div className="h-32 animate-pulse rounded-xl bg-cream-soft" />
                ) : (
                  renderOfferingList(offerings)
                )}
              </div>
            </div>
          </PagePanel>
        ) : null}
      </AdminContent>

      <FormModal
        open={stageModalOpen}
        onClose={() => !saveStageMutation.isPending && setStageModalOpen(false)}
        title={editingStage ? 'تعديل مرحلة' : 'إضافة مرحلة'}
        eyebrow="STAGE"
        footer={
          <>
            <button
              type="button"
              onClick={() => setStageModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveStageMutation.isPending}
              onClick={() => {
                if (!stageForm.name.trim()) {
                  toast.error('اسم المرحلة مطلوب');
                  return;
                }
                saveStageMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveStageMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>اسم المرحلة</label>
            <input
              className={formFieldClass}
              value={stageForm.name}
              onChange={(e) => setStageForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الترتيب</label>
            <input
              className={`${formFieldClass} font-latin text-left`}
              dir="ltr"
              type="number"
              min="0"
              value={stageForm.order}
              onChange={(e) => setStageForm((f) => ({ ...f, order: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        open={gradeModalOpen}
        onClose={() => !saveGradeMutation.isPending && setGradeModalOpen(false)}
        title={editingGrade ? 'تعديل صف' : 'إضافة صف'}
        eyebrow="GRADE"
        footer={
          <>
            <button
              type="button"
              onClick={() => setGradeModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveGradeMutation.isPending}
              onClick={() => {
                if (!gradeForm.name.trim()) {
                  toast.error('اسم الصف مطلوب');
                  return;
                }
                saveGradeMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveGradeMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>اسم الصف</label>
            <input
              className={formFieldClass}
              value={gradeForm.name}
              onChange={(e) => setGradeForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>المرحلة</label>
            <input className={formFieldClass} value={drill.stageName} disabled />
          </div>
          <div>
            <label className={formLabelClass}>الترتيب</label>
            <input
              className={`${formFieldClass} font-latin text-left`}
              dir="ltr"
              type="number"
              min="0"
              value={gradeForm.order}
              onChange={(e) => setGradeForm((f) => ({ ...f, order: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        open={linkSubjectOpen}
        onClose={() => setLinkSubjectOpen(false)}
        title="ربط مادة بالصف"
        eyebrow="LINK SUBJECT"
        wide
        footer={
          <button
            type="button"
            onClick={() => setLinkSubjectOpen(false)}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[12.5px] text-ink-dim">مواد غير مربوطة بهذا الصف</p>
          <button
            type="button"
            onClick={() => {
              setLinkSubjectOpen(false);
              setCreateSubjectOpen(true);
            }}
            className="text-[12px] font-bold text-gold hover:underline"
          >
            إنشاء مادة جديدة
          </button>
        </div>
        {unlinkedSubjects.length === 0 ? (
          <p className="text-[13px] text-ink-dim">كل المواد مربوطة أو لا توجد مواد في الكتالوج.</p>
        ) : (
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {unlinkedSubjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                disabled={linkSubjectMutation.isPending}
                onClick={() => linkSubjectMutation.mutate(subject.id)}
                className="flex w-full items-center justify-between rounded-xl border border-cream-line px-3 py-2.5 text-right hover:bg-cream-soft"
              >
                <span className="text-[13.5px] font-semibold text-ink">{subject.name}</span>
                <Icon name="fa-solid fa-plus" className="text-[11px] text-gold" />
              </button>
            ))}
          </div>
        )}
      </FormModal>

      <FormModal
        open={createSubjectOpen}
        onClose={() => !createSubjectMutation.isPending && setCreateSubjectOpen(false)}
        title="إنشاء مادة جديدة"
        eyebrow="NEW SUBJECT"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateSubjectOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={createSubjectMutation.isPending}
              onClick={() => {
                if (!newSubjectName.trim()) {
                  toast.error('اسم المادة مطلوب');
                  return;
                }
                createSubjectMutation.mutate(newSubjectName);
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {createSubjectMutation.isPending ? 'جاري الإنشاء…' : 'إنشاء وربط'}
            </button>
          </>
        }
      >
        <label className={formLabelClass}>اسم المادة</label>
        <input
          className={formFieldClass}
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          placeholder="مثال: رياضيات"
        />
      </FormModal>

      <FormModal
        open={sectionModalOpen}
        onClose={() => !saveSectionMutation.isPending && setSectionModalOpen(false)}
        title={editingSection ? 'تعديل شعبة' : 'إضافة شعبة'}
        eyebrow="SECTION"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveSectionMutation.isPending}
              onClick={() => {
                if (!sectionForm.name.trim()) {
                  toast.error('اسم الشعبة مطلوب');
                  return;
                }
                saveSectionMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveSectionMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={formLabelClass}>اسم الشعبة</label>
            <input
              className={formFieldClass}
              value={sectionForm.name}
              onChange={(e) => setSectionForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="مثال: شعبة أ"
            />
          </div>
          <div>
            <label className={formLabelClass}>الجنس (اختياري)</label>
            <select
              className={formFieldClass}
              value={sectionForm.gender}
              onChange={(e) =>
                setSectionForm((s) => ({
                  ...s,
                  gender: e.target.value as SectionForm['gender'],
                }))
              }
            >
              <option value="">غير محدد</option>
              <option value="male">ذكور</option>
              <option value="female">إناث</option>
            </select>
          </div>
          <div>
            <label className={formLabelClass}>السعة (اختياري)</label>
            <input
              type="number"
              min={1}
              className={formFieldClass}
              value={sectionForm.capacity}
              onChange={(e) => setSectionForm((s) => ({ ...s, capacity: e.target.value }))}
              placeholder="30"
            />
          </div>
        </div>
      </FormModal>

      {drill.gradeId != null && drill.subjectId != null ? (
        <CreateOfferingWithScheduleModal
          open={createOfferingOpen}
          onClose={() => setCreateOfferingOpen(false)}
          gradeId={drill.gradeId}
          gradeSectionId={drill.sectionId}
          subjectId={drill.subjectId}
          subjectName={drill.subjectName}
          gender={createOfferingGender}
          onSuccess={invalidateOfferings}
        />
      ) : null}

      <EditOfferingModal
        open={Boolean(editOfferingTarget)}
        onClose={() => setEditOfferingTarget(null)}
        offering={editOfferingTarget}
        onSuccess={invalidateOfferings}
      />

      <EditScheduleModal
        open={Boolean(editScheduleTarget)}
        onClose={() => setEditScheduleTarget(null)}
        schedule={editScheduleTarget}
        onSuccess={invalidateOfferings}
      />

      <ConfirmDialog
        open={Boolean(deleteOfferingTarget)}
        onClose={() => setDeleteOfferingTarget(null)}
        title={
          (deleteOfferingTarget?.active_students_count ?? 0) > 0
            ? 'لا يمكن حذف الجدول'
            : 'حذف الجدول؟'
        }
        body={
          deleteOfferingTarget
            ? (deleteOfferingTarget.active_students_count ?? 0) > 0
              ? `يوجد ${deleteOfferingTarget.active_students_count} طالب مسجّل حالياً بهذا الجدول. يجب نقلهم أو إلغاء تسجيلهم قبل الحذف.`
              : `سيتم حذف جدول «${deleteOfferingTarget.teacher?.name ?? ''}» نهائياً مع مواعيده.`
            : ''
        }
        confirmLabel={(deleteOfferingTarget?.active_students_count ?? 0) > 0 ? 'حسناً' : 'حذف'}
        loading={deleteOfferingMutation.isPending}
        onConfirm={() => {
          if (!deleteOfferingTarget) return;
          if ((deleteOfferingTarget.active_students_count ?? 0) > 0) {
            setDeleteOfferingTarget(null);
            return;
          }
          deleteOfferingMutation.mutate(deleteOfferingTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteScheduleTarget)}
        onClose={() => setDeleteScheduleTarget(null)}
        title="حذف الموعد؟"
        body={
          deleteScheduleTarget
            ? `${formatScheduleSlot(deleteScheduleTarget.day_of_week, deleteScheduleTarget.start_time, deleteScheduleTarget.end_time)} — لن يُلغى تسجيل الطلاب، فقط هذا الموعد الأسبوعي.`
            : ''
        }
        loading={deleteScheduleMutation.isPending}
        onConfirm={() => deleteScheduleTarget && deleteScheduleMutation.mutate(deleteScheduleTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(deleteStageTarget)}
        onClose={() => setDeleteStageTarget(null)}
        title="حذف المرحلة؟"
        body={`سيتم حذف «${deleteStageTarget?.name ?? ''}».`}
        loading={deleteStageMutation.isPending}
        onConfirm={() => deleteStageTarget && deleteStageMutation.mutate(deleteStageTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(deleteGradeTarget)}
        onClose={() => setDeleteGradeTarget(null)}
        title="حذف الصف؟"
        body={`سيتم حذف «${deleteGradeTarget?.name ?? ''}».`}
        loading={deleteGradeMutation.isPending}
        onConfirm={() => deleteGradeTarget && deleteGradeMutation.mutate(deleteGradeTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(deleteSectionTarget)}
        onClose={() => setDeleteSectionTarget(null)}
        title="حذف الشعبة؟"
        body={`سيتم حذف «${deleteSectionTarget?.name ?? ''}».`}
        loading={deleteSectionMutation.isPending}
        onConfirm={() => deleteSectionTarget && deleteSectionMutation.mutate(deleteSectionTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(detachSubjectTarget)}
        onClose={() => setDetachSubjectTarget(null)}
        title="إلغاء ربط المادة؟"
        body={`إلغاء ربط «${detachSubjectTarget?.name ?? ''}» من هذا الصف.`}
        loading={detachSubjectMutation.isPending}
        onConfirm={() => detachSubjectTarget && detachSubjectMutation.mutate(detachSubjectTarget.id)}
      />
    </>
  );
}
