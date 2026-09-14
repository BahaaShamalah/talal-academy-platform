'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { MediaPicker } from '@/components/media/media-picker';
import {
  apiClient,
  qs,
  type EducationalStage,
  type Grade,
  type GradeSection,
  type InstituteSetting,
  type Paginated,
} from '@/lib/api-client';
import { openScheduleExport, type ScheduleExportFilters } from '@/lib/schedule-export';
import { openPrintPreviewWindow } from '@/lib/print/print-utils';
import {
  defaultPrintSettings,
  loadPrintSettings,
  printScheduleGridHtml,
  savePrintSettings,
  type SchedulePrintSettings,
} from '@/lib/schedule-grid-print';
import {
  buildScheduleGridUrl,
  type ScheduleGridFilters,
  type ScheduleGridGrade,
  type ScheduleGridResponse,
} from '@/lib/schedule-grid';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

type Level = 1 | 2 | 3;

type Drill = {
  level: Level;
  stageId: number | null;
  stageName: string;
  sectionId: number | null;
  sectionName: string;
  gradeId: number | null;
  gradeName: string;
};

const ROOT: Drill = {
  level: 1,
  stageId: null,
  stageName: '',
  sectionId: null,
  sectionName: '',
  gradeId: null,
  gradeName: '',
};

const DAY_COLUMNS = [
  { key: 'saturday' as const, label: 'السبت' },
  { key: 'sunday' as const, label: 'الأحد' },
  { key: 'monday' as const, label: 'الإثنين' },
  { key: 'tuesday' as const, label: 'الثلاثاء' },
  { key: 'wednesday' as const, label: 'الأربعاء' },
];

const STAGE_ICONS = [
  'fa-solid fa-child',
  'fa-solid fa-user-graduate',
  'fa-solid fa-graduation-cap',
];

type LetterheadDraft = {
  institute_name_ar: string;
  institute_name_en: string;
  address: string;
  phone: string;
  email: string;
  director_name: string;
  logo_media_id: number | null;
  logo_url: string | null;
  remove_logo: boolean;
};

function letterheadFromInstitute(data: InstituteSetting | undefined): LetterheadDraft {
  return {
    institute_name_ar: data?.institute_name_ar ?? '',
    institute_name_en: data?.institute_name_en ?? '',
    address: data?.address ?? '',
    phone: data?.phone ?? '',
    email: data?.email ?? '',
    director_name: data?.director_name ?? '',
    logo_media_id: data?.logo_media_id ?? null,
    logo_url: data?.logo_url ?? null,
    remove_logo: false,
  };
}

function genderLabel(gender?: string | null) {
  if (gender === 'male') return 'ذكور';
  if (gender === 'female') return 'إناث';
  return '';
}

function GradeGridTable({ grade }: { grade: ScheduleGridGrade }) {
  if (grade.timeslots.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-cream-line bg-white py-6 text-center text-[12px] text-ink-dim">
        لا توجد حصص لهذه الشعبة بعد.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-cream-line bg-white shadow-sm">
      <table className="w-full min-w-[520px] border-collapse text-center">
        <thead>
          <tr>
            <th className="border border-navy/15 bg-navy px-2 py-2.5 text-[11px] font-bold text-gold">
              الوقت
            </th>
            {DAY_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="border border-navy/15 bg-navy px-2 py-2.5 text-[11px] font-bold text-gold"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.timeslots.map((slot) => (
            <tr key={`${slot.start_time}-${slot.end_time}`} className="even:bg-cream-soft/60">
              <td className="whitespace-nowrap border border-cream-line bg-cream-soft px-2 py-3 text-[10.5px] font-bold text-navy">
                {slot.time_range}
              </td>
              {DAY_COLUMNS.map((col) => {
                const value = slot.days[col.key];
                const conflict = Boolean(value?.includes('،'));
                return (
                  <td
                    key={col.key}
                    className={`min-h-[40px] border border-cream-line px-2 py-3 text-[12px] font-bold ${
                      conflict ? 'bg-[#fdf0f0] text-[#a34b4b]' : 'text-navy'
                    }`}
                  >
                    {value ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrillCard({
  title,
  subtitle,
  icon,
  onClick,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[16px] border border-cream-line bg-white p-4 text-right transition-all hover:-translate-y-px hover:border-gold/35 hover:bg-cream-soft/30 hover:shadow-[0_12px_28px_-20px_rgba(200,162,74,.35)]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cream-soft to-white text-gold ring-1 ring-cream-line">
        <Icon name={icon} className="text-[17px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-[15px] font-bold text-ink">{title}</div>
          {badge}
        </div>
        <div className="mt-0.5 text-[12px] text-ink-dim">{subtitle}</div>
      </div>
      <Icon
        name="fa-solid fa-chevron-left"
        className="shrink-0 text-[11px] text-ink-faint transition-transform group-hover:-translate-x-0.5 group-hover:text-gold"
      />
    </button>
  );
}

export function ScheduleGridPage() {
  const qc = useQueryClient();
  const [drill, setDrill] = useState<Drill>(ROOT);
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState<SchedulePrintSettings>(() =>
    loadPrintSettings(),
  );
  const [letterhead, setLetterhead] = useState<LetterheadDraft>(() =>
    letterheadFromInstitute(undefined),
  );
  const canManage = useAuthStore((s) => s.hasPermission('course-groups.manage'));
  const canManageSettings = useAuthStore((s) => s.hasPermission('settings.manage'));

  const stagesQuery = useQuery({
    queryKey: ['educational-stages'],
    queryFn: () =>
      apiClient<Paginated<EducationalStage>>(`/educational-stages${qs({ per_page: 50 })}`),
  });

  const gradesQuery = useQuery({
    queryKey: ['grades', 'schedule-grid', drill.stageId],
    queryFn: () =>
      apiClient<Paginated<Grade>>(
        `/grades${qs({
          per_page: 100,
          include: 'educationalStage',
          'filter[educational_stage_id]': drill.stageId ?? undefined,
        })}`,
      ),
    enabled: drill.level >= 2 && drill.stageId != null,
  });

  const sectionsQuery = useQuery({
    queryKey: ['grade-sections', 'schedule-grid', drill.stageId, gradesQuery.dataUpdatedAt],
    queryFn: async () => {
      const gradeIds = (gradesQuery.data?.data ?? []).map((g) => g.id);
      if (gradeIds.length === 0) return [] as Array<GradeSection & { grade?: Grade | null }>;

      const res = await apiClient<Paginated<GradeSection>>(
        `/grade-sections${qs({
          per_page: 200,
          include: 'grade',
        })}`,
      );
      const gradeSet = new Set(gradeIds);
      return (res.data ?? []).filter((s) => gradeSet.has(s.grade_id));
    },
    enabled: drill.level >= 2 && drill.stageId != null && Boolean(gradesQuery.data),
  });

  const gridFilters = useMemo((): ScheduleGridFilters => {
    if (drill.level === 3 && drill.sectionId != null) {
      return {
        educational_stage_id: drill.stageId ?? undefined,
        grade_id: drill.gradeId ?? undefined,
        grade_section_id: drill.sectionId,
      };
    }
    if (drill.level === 2 && drill.stageId != null) {
      return { educational_stage_id: drill.stageId };
    }
    return {};
  }, [drill]);

  const stageExportFilters = useMemo((): ScheduleExportFilters => {
    if (drill.stageId == null) return {};
    return { educational_stage_id: drill.stageId };
  }, [drill.stageId]);

  const exportFilters = useMemo((): ScheduleExportFilters => gridFilters, [gridFilters]);

  const gridQuery = useQuery({
    queryKey: ['schedule-grid', gridFilters],
    queryFn: () => apiClient<ScheduleGridResponse>(buildScheduleGridUrl(gridFilters)),
    enabled: drill.level >= 2 && drill.stageId != null,
  });

  const stageGridQuery = useQuery({
    queryKey: ['schedule-grid', 'stage', drill.stageId],
    queryFn: () =>
      apiClient<ScheduleGridResponse>(
        buildScheduleGridUrl({ educational_stage_id: drill.stageId! }),
      ),
    enabled: drill.level >= 2 && drill.stageId != null,
    staleTime: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: () => apiClient<InstituteSetting>('/settings/institute'),
  });

  const stages = stagesQuery.data?.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const gradesById = useMemo(() => {
    const map = new Map<number, Grade>();
    for (const g of gradesQuery.data?.data ?? []) map.set(g.id, g);
    return map;
  }, [gradesQuery.data?.data]);

  const data = gridQuery.data;
  const institute = settingsQuery.data;
  const selectedGrid = useMemo(() => {
    if (drill.level !== 3 || drill.sectionId == null) return null;
    return (
      (data?.grades ?? []).find((g) => g.grade_section_id === drill.sectionId) ?? null
    );
  }, [data?.grades, drill.level, drill.sectionId]);

  const slotCountBySection = useMemo(() => {
    const map = new Map<number, number>();
    const rows = stageGridQuery.data?.grades ?? data?.grades ?? [];
    for (const g of rows) {
      if (g.grade_section_id != null) {
        map.set(g.grade_section_id, g.timeslots.length);
      }
    }
    return map;
  }, [stageGridQuery.data?.grades, data?.grades]);

  const saveLetterheadMutation = useMutation({
    mutationFn: async () => {
      if (!letterhead.institute_name_ar.trim()) {
        throw new Error('اسم المعهد بالعربية مطلوب للترويسة');
      }
      const payload: Record<string, unknown> = {
        institute_name_ar: letterhead.institute_name_ar.trim(),
        institute_name_en: letterhead.institute_name_en.trim() || null,
        address: letterhead.address.trim() || null,
        phone: letterhead.phone.trim() || null,
        email: letterhead.email.trim() || null,
        director_name: letterhead.director_name.trim() || null,
      };
      if (letterhead.remove_logo) payload.remove_logo = true;
      else if (letterhead.logo_media_id) payload.logo_media_id = letterhead.logo_media_id;

      return apiClient<InstituteSetting>('/settings/institute', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (next) => {
      qc.setQueryData(['institute-settings'], next);
      qc.invalidateQueries({ queryKey: ['institute-settings'] });
      setLetterhead(letterheadFromInstitute(next));
    },
  });

  function openPrintSettings() {
    const loaded = loadPrintSettings();
    setPrintSettings({
      ...loaded,
      directorName: loaded.directorName || institute?.director_name || '',
      logoMediaId: loaded.logoMediaId ?? institute?.logo_media_id ?? null,
      logoUrl: loaded.logoUrl ?? institute?.logo_url ?? null,
    });
    setLetterhead(letterheadFromInstitute(institute));
    setPrintSettingsOpen(true);
  }

  async function handlePrint(scope: 'section' | 'stage' = 'section') {
    if (drill.level === 1 || drill.stageId == null) {
      toast.message('اختر مرحلة أولًا لطباعة جداولها');
      return;
    }

    const stageData = stageGridQuery.data;
    const sectionData = data;

    if (scope === 'stage') {
      if (!stageData || (stageData.grades?.length ?? 0) === 0) {
        toast.error('لا توجد جداول في هذه المرحلة للطباعة');
        return;
      }
    } else if (drill.level === 3) {
      if (!sectionData || !selectedGrid) {
        toast.error('لا بيانات للطباعة');
        return;
      }
    } else {
      // level 2 default = full stage
      if (!stageData || (stageData.grades?.length ?? 0) === 0) {
        toast.error('لا توجد جداول في هذه المرحلة للطباعة');
        return;
      }
      scope = 'stage';
    }

    let preview: Window | null = null;
    try {
      preview = openPrintPreviewWindow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
      return;
    }

    try {
      const settings = {
        ...printSettings,
        directorName:
          printSettings.directorName.trim() ||
          institute?.director_name ||
          printSettings.directorName,
        documentTitle:
          printSettings.documentTitle.trim() ||
          (scope === 'stage'
            ? `جداول ${drill.stageName} كاملة`
            : `جدول ${drill.gradeName} — ${drill.sectionName}`),
      };

      const source = scope === 'stage' ? stageData! : sectionData!;
      const printPayload: ScheduleGridResponse =
        scope === 'section' && selectedGrid
          ? {
              ...source,
              title: settings.documentTitle,
              subtitle: drill.stageName || source.subtitle,
              grades: [selectedGrid],
              has_conflicts: false,
              conflicts: [],
              notes: ['لا يوجد تعارضات في الجدول.'],
            }
          : {
              ...source,
              title: settings.documentTitle,
              subtitle: drill.stageName || source.subtitle,
              grades: source.grades ?? [],
            };

      await printScheduleGridHtml({
        grid: printPayload,
        settings,
        institute,
        targetWindow: preview,
      });
    } catch (err) {
      try {
        preview.close();
      } catch {
        /* ignore */
      }
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
    }
  }

  async function saveAndClosePrintSettings() {
    try {
      savePrintSettings({
        ...printSettings,
        directorName: letterhead.director_name.trim() || printSettings.directorName,
        logoMediaId: letterhead.remove_logo ? null : letterhead.logo_media_id,
        logoUrl: letterhead.remove_logo ? null : letterhead.logo_url,
        showLogo: printSettings.showLogo,
      });
      setPrintSettings((s) => ({
        ...s,
        directorName: letterhead.director_name.trim() || s.directorName,
        logoMediaId: letterhead.remove_logo ? null : letterhead.logo_media_id,
        logoUrl: letterhead.remove_logo ? null : letterhead.logo_url,
      }));

      if (canManageSettings) {
        await saveLetterheadMutation.mutateAsync();
        toast.success('تم حفظ إعدادات الطباعة وبيانات الترويسة');
      } else {
        toast.success('تم حفظ إعدادات الطباعة محليًا');
      }
      setPrintSettingsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر الحفظ');
    }
  }

  const crumb =
    drill.level === 1
      ? 'اختر مرحلة تعليمية'
      : drill.level === 2
        ? `${drill.stageName} — الشعب`
        : `${drill.stageName} ← ${drill.gradeName} — ${drill.sectionName}`;

  return (
    <>
      <AdminHeader title="عرض الجدول" crumb={crumb} />

      <AdminContent className="max-w-[960px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <button
              type="button"
              onClick={() => setDrill(ROOT)}
              className={cn(
                'rounded-full px-3 py-1.5 font-bold transition',
                drill.level === 1 ? 'bg-navy text-gold' : 'text-ink-soft hover:bg-cream-soft',
              )}
            >
              المراحل
            </button>
            {drill.level >= 2 ? (
              <>
                <Icon name="fa-solid fa-chevron-left" className="text-[9px] text-ink-faint" />
                <button
                  type="button"
                  onClick={() =>
                    setDrill((prev) => ({
                      ...prev,
                      level: 2,
                      sectionId: null,
                      sectionName: '',
                      gradeId: null,
                      gradeName: '',
                    }))
                  }
                  className={cn(
                    'rounded-full px-3 py-1.5 font-bold transition',
                    drill.level === 2 ? 'bg-navy text-gold' : 'text-ink-soft hover:bg-cream-soft',
                  )}
                >
                  {drill.stageName}
                </button>
              </>
            ) : null}
            {drill.level >= 3 ? (
              <>
                <Icon name="fa-solid fa-chevron-left" className="text-[9px] text-ink-faint" />
                <span className="rounded-full bg-navy px-3 py-1.5 font-bold text-gold">
                  {drill.sectionName}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openPrintSettings}
              className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-navy shadow-sm transition hover:border-gold"
            >
              <Icon name="fa-solid fa-sliders" className="text-[11px] text-gold" />
              إعدادات الطباعة
            </button>
            {drill.level >= 2 ? (
              <>
                <button
                  type="button"
                  disabled={stageGridQuery.isLoading || !(stageGridQuery.data?.grades?.length)}
                  onClick={() => openScheduleExport(stageExportFilters, 'download')}
                  className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-navy shadow-sm transition hover:border-gold disabled:opacity-40"
                  title="تصدير PDF لكل شعب المرحلة"
                >
                  <Icon name="fa-solid fa-file-pdf" className="text-[11px] text-gold" />
                  PDF المرحلة
                </button>
                <button
                  type="button"
                  disabled={stageGridQuery.isLoading || !(stageGridQuery.data?.grades?.length)}
                  onClick={() => void handlePrint('stage')}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[12.5px] font-extrabold text-navy shadow-sm transition hover:-translate-y-px disabled:opacity-40"
                  title="طباعة جداول كل شعب المرحلة"
                >
                  <Icon name="fa-solid fa-print" className="text-[11px]" />
                  طباعة جداول المرحلة
                </button>
              </>
            ) : null}
            {drill.level === 3 ? (
              <>
                <button
                  type="button"
                  disabled={!selectedGrid}
                  onClick={() => openScheduleExport(exportFilters, 'download')}
                  className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-navy shadow-sm transition hover:border-gold disabled:opacity-40"
                >
                  <Icon name="fa-solid fa-file-pdf" className="text-[11px] text-gold" />
                  PDF الشعبة
                </button>
                <button
                  type="button"
                  disabled={!selectedGrid}
                  onClick={() => void handlePrint('section')}
                  className="flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-navy shadow-sm transition hover:border-gold disabled:opacity-40"
                >
                  <Icon name="fa-solid fa-print" className="text-[11px] text-gold" />
                  طباعة الشعبة
                </button>
              </>
            ) : null}
          </div>
        </div>

        {data?.period_name && drill.level >= 2 ? (
          <p className="text-center text-[12px] text-ink-dim">
            الفترة الدراسية: {data.period_name}
          </p>
        ) : null}

        {drill.level === 1 ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-[18px] font-bold text-navy-800">المراحل التعليمية</h2>
              <p className="mt-1 text-[13px] text-ink-dim">اختر مرحلة لعرض شعبها وجداولها</p>
            </div>
            {stagesQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[76px] animate-pulse rounded-[16px] bg-cream-soft" />
                ))}
              </div>
            ) : stages.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-layer-group"
                title="لا توجد مراحل"
                body="أضف مراحل من إدارة المراحل والجداول."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stages.map((stage, index) => (
                  <DrillCard
                    key={stage.id}
                    title={stage.name}
                    subtitle={`${stage.grades_count ?? 0} صف`}
                    icon={STAGE_ICONS[index % STAGE_ICONS.length]}
                    onClick={() =>
                      setDrill({
                        level: 2,
                        stageId: stage.id,
                        stageName: stage.name,
                        sectionId: null,
                        sectionName: '',
                        gradeId: null,
                        gradeName: '',
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {drill.level === 2 ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-bold text-navy-800">
                  شعب {drill.stageName}
                </h2>
                <p className="mt-1 text-[13px] text-ink-dim">اختر شعبة لعرض جدولها الأسبوعي</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={stageGridQuery.isLoading || !(stageGridQuery.data?.grades?.length)}
                  onClick={() => void handlePrint('stage')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[12.5px] font-extrabold text-navy disabled:opacity-40"
                >
                  <Icon name="fa-solid fa-print" className="text-[11px]" />
                  طباعة جداول المرحلة كاملة
                </button>
                {canManage ? (
                  <Link
                    href="/dashboard/schedule-bulk-import"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-white px-4 py-2 text-[12.5px] font-extrabold text-navy"
                  >
                    <Icon name="fa-solid fa-plus" className="text-[11px]" />
                    إدخال جدول
                  </Link>
                ) : null}
              </div>
            </div>

            {gradesQuery.isLoading || sectionsQuery.isLoading || gridQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-[16px] bg-cream-soft" />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-layer-group"
                title="لا توجد شعب في هذه المرحلة"
                body="أضف شعبًا من إدارة المراحل والجداول أولًا."
                primary={
                  canManage
                    ? {
                        label: 'إدارة المراحل والجداول',
                        onClick: () => {
                          window.location.href = '/dashboard/academic-structure';
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sections.map((section) => {
                  const grade = gradesById.get(section.grade_id) ?? section.grade;
                  const gLabel = genderLabel(section.gender);
                  const slots = slotCountBySection.get(section.id) ?? 0;
                  return (
                    <DrillCard
                      key={section.id}
                      title={section.name}
                      subtitle={`${grade?.name ?? 'صف'} · ${slots} فترة زمنية`}
                      icon={
                        section.gender === 'female'
                          ? 'fa-solid fa-venus'
                          : section.gender === 'male'
                            ? 'fa-solid fa-mars'
                            : 'fa-solid fa-users'
                      }
                      badge={
                        gLabel ? (
                          <span className="rounded-full bg-cream-soft px-2 py-0.5 text-[10.5px] font-bold text-ink-dim">
                            {gLabel}
                          </span>
                        ) : null
                      }
                      onClick={() =>
                        setDrill((prev) => ({
                          ...prev,
                          level: 3,
                          sectionId: section.id,
                          sectionName: section.name,
                          gradeId: section.grade_id,
                          gradeName: grade?.name ?? '',
                        }))
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {drill.level === 3 ? (
          <div className="space-y-4">
            <div className="rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-navy-800">
                    {drill.gradeName}
                    {drill.sectionName ? ` — ${drill.sectionName}` : ''}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-dim">{drill.stageName}</p>
                </div>
                {canManage && drill.gradeId ? (
                  <Link
                    href={`/dashboard/schedule-bulk-import?grade_id=${drill.gradeId}&grade_section_id=${drill.sectionId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-gold bg-white px-4 py-2 text-[12.5px] font-extrabold text-navy"
                  >
                    <Icon name="fa-solid fa-pen" className="text-[11px]" />
                    تعديل الجدول
                  </Link>
                ) : null}
              </div>

              {gridQuery.isLoading ? (
                <div className="h-48 animate-pulse rounded-[14px] bg-cream-soft" />
              ) : gridQuery.isError ? (
                <p className="py-8 text-center text-[13px] text-[#a34b4b]">تعذّر تحميل الجدول.</p>
              ) : selectedGrid ? (
                <GradeGridTable grade={selectedGrid} />
              ) : (
                <EmptyState
                  icon="fa-solid fa-calendar-xmark"
                  title="لا يوجد جدول لهذه الشعبة"
                  body="أدخل الحصص من الاستيراد الجماعي أو إدارة المراحل."
                />
              )}
            </div>
          </div>
        ) : null}
      </AdminContent>

      <FormModal
        open={printSettingsOpen}
        onClose={() => setPrintSettingsOpen(false)}
        title="إعدادات الطباعة"
        eyebrow="PRINT"
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setPrintSettings(defaultPrintSettings());
                setLetterhead(letterheadFromInstitute(institute));
              }}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              افتراضي
            </button>
            <button
              type="button"
              disabled={saveLetterheadMutation.isPending}
              onClick={() => void saveAndClosePrintSettings()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-60"
            >
              {saveLetterheadMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <section className="space-y-3 rounded-[14px] border border-cream-line bg-cream-soft/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13.5px] font-extrabold text-navy">ترويسة المستند الرسمية</h3>
              <Link
                href="/dashboard/settings"
                className="text-[12px] font-bold text-gold-deep underline-offset-2 hover:underline"
              >
                صفحة إعدادات المعهد
              </Link>
            </div>
            <MediaPicker
              label="شعار الترويسة"
              valueId={letterhead.remove_logo ? null : letterhead.logo_media_id}
              valueUrl={letterhead.remove_logo ? null : letterhead.logo_url}
              onChange={(m) => {
                setLetterhead((s) => ({
                  ...s,
                  logo_media_id: m.id,
                  logo_url: m.url,
                  remove_logo: false,
                }));
                setPrintSettings((s) => ({
                  ...s,
                  showLogo: true,
                  logoMediaId: m.id,
                  logoUrl: m.url,
                }));
              }}
              onClear={() => {
                setLetterhead((s) => ({
                  ...s,
                  logo_media_id: null,
                  logo_url: null,
                  remove_logo: true,
                }));
                setPrintSettings((s) => ({
                  ...s,
                  logoMediaId: null,
                  logoUrl: null,
                }));
              }}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={formLabelClass}>اسم المعهد (عربي)</label>
                <input
                  className={formFieldClass}
                  disabled={!canManageSettings}
                  value={letterhead.institute_name_ar}
                  onChange={(e) =>
                    setLetterhead((s) => ({ ...s, institute_name_ar: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>اسم المعهد (إنجليزي)</label>
                <input
                  className={formFieldClass}
                  dir="ltr"
                  disabled={!canManageSettings}
                  value={letterhead.institute_name_en}
                  onChange={(e) =>
                    setLetterhead((s) => ({ ...s, institute_name_en: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>العنوان</label>
                <input
                  className={formFieldClass}
                  disabled={!canManageSettings}
                  value={letterhead.address}
                  onChange={(e) => setLetterhead((s) => ({ ...s, address: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>الهاتف</label>
                <input
                  className={formFieldClass}
                  dir="ltr"
                  disabled={!canManageSettings}
                  value={letterhead.phone}
                  onChange={(e) => setLetterhead((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>البريد</label>
                <input
                  className={formFieldClass}
                  dir="ltr"
                  disabled={!canManageSettings}
                  value={letterhead.email}
                  onChange={(e) => setLetterhead((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>اسم المدير (لاعتماد التوقيع)</label>
                <input
                  className={formFieldClass}
                  disabled={!canManageSettings}
                  value={letterhead.director_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLetterhead((s) => ({ ...s, director_name: value }));
                    setPrintSettings((s) => ({ ...s, directorName: value }));
                  }}
                />
              </div>
            </div>
          </section>

          <div>
            <label className={formLabelClass}>عنوان الطباعة</label>
            <input
              className={formFieldClass}
              value={printSettings.documentTitle}
              placeholder={
                drill.level === 3
                  ? `جدول ${drill.gradeName} — ${drill.sectionName}`
                  : drill.level === 2
                    ? `جداول ${drill.stageName}`
                    : 'عنوان المستند'
              }
              onChange={(e) =>
                setPrintSettings((s) => ({ ...s, documentTitle: e.target.value }))
              }
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold"
              checked={printSettings.showLogo}
              onChange={(e) =>
                setPrintSettings((s) => ({ ...s, showLogo: e.target.checked }))
              }
            />
            إظهار الشعار في الترويسة
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold"
              checked={printSettings.showSignature}
              onChange={(e) =>
                setPrintSettings((s) => ({ ...s, showSignature: e.target.checked }))
              }
            />
            إظهار توقيعات الإعداد / الاعتماد / الختم
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold"
              checked={printSettings.showNotes}
              onChange={(e) =>
                setPrintSettings((s) => ({ ...s, showNotes: e.target.checked }))
              }
            />
            إظهار ملاحظات التعارضات
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold"
              checked={printSettings.showPeriod}
              onChange={(e) =>
                setPrintSettings((s) => ({ ...s, showPeriod: e.target.checked }))
              }
            />
            إظهار اسم الفترة الدراسية
          </label>
          <div>
            <label className={formLabelClass}>اتجاه الصفحة</label>
            <select
              className={formFieldClass}
              value={printSettings.orientation}
              onChange={(e) =>
                setPrintSettings((s) => ({
                  ...s,
                  orientation: e.target.value as 'portrait' | 'landscape',
                }))
              }
            >
              <option value="portrait">عمودي (A4)</option>
              <option value="landscape">أفقي</option>
            </select>
          </div>
        </div>
      </FormModal>
    </>
  );
}
