import type { PrintInstituteBranding } from '@/components/print/types';
import type { InstituteSetting } from '@/lib/api-client';
import { brandingFromInstitute } from '@/lib/print/branding';
import { buildPrintableHtmlDocument } from '@/lib/print/build-printable-html';
import { printHtmlDocument } from '@/lib/print/print-utils';
import type { ScheduleGridGrade, ScheduleGridResponse } from '@/lib/schedule-grid';

export type SchedulePrintSettings = {
  showLogo: boolean;
  showSignature: boolean;
  showNotes: boolean;
  showPeriod: boolean;
  directorName: string;
  orientation: 'portrait' | 'landscape';
  documentTitle: string;
  logoMediaId: number | null;
  logoUrl: string | null;
};

const STORAGE_KEY = 'schedule-grid-print-settings';

export const defaultPrintSettings = (): SchedulePrintSettings => ({
  showLogo: true,
  showSignature: true,
  showNotes: true,
  showPeriod: true,
  directorName: '',
  orientation: 'portrait',
  documentTitle: '',
  logoMediaId: null,
  logoUrl: null,
});

export function loadPrintSettings(): SchedulePrintSettings {
  if (typeof window === 'undefined') return defaultPrintSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrintSettings();
    return { ...defaultPrintSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultPrintSettings();
  }
}

export function savePrintSettings(settings: SchedulePrintSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function groupGradesByStage(grades: ScheduleGridGrade[]): Array<[string, ScheduleGridGrade[]]> {
  const map = new Map<string, ScheduleGridGrade[]>();
  for (const grade of grades) {
    const key = grade.stage_name || 'بدون مرحلة';
    const list = map.get(key) ?? [];
    list.push(grade);
    map.set(key, list);
  }
  return Array.from(map.entries());
}

/** One grade block matching the official reference layout (meta + table). */
function renderGradeBlock(
  grade: ScheduleGridGrade,
  dayColumns: ScheduleGridResponse['day_columns'],
): string {
  const sectionName =
    grade.grade_section_name && grade.grade_section_name !== 'بدون شعبة'
      ? grade.grade_section_name
      : '—';

  const rows = (grade.timeslots ?? [])
    .map((slot) => {
      const dayCells = (dayColumns ?? [])
        .map((col) => {
          const value = slot.days[col.key] ?? '';
          const isConflict = value.includes('،');
          return `<td class="${isConflict ? 'conflict' : ''}">${esc(value)}</td>`;
        })
        .join('');
      return `<tr><td class="time">${esc(slot.time_range)}</td>${dayCells}</tr>`;
    })
    .join('');

  const head = (dayColumns ?? []).map((col) => `<th>${esc(col.label)}</th>`).join('');
  const colCount = 1 + (dayColumns?.length ?? 0);

  return `
    <section class="grade-doc ta-print-avoid-break">
      <div class="ta-print-meta">
        <div class="ta-print-meta__item">
          <span class="ta-print-meta__label">المرحلة</span>
          <span class="ta-print-meta__value">${esc(grade.stage_name || '—')}</span>
        </div>
        <div class="ta-print-meta__item">
          <span class="ta-print-meta__label">الصف</span>
          <span class="ta-print-meta__value">${esc(grade.grade_name)}</span>
        </div>
        <div class="ta-print-meta__item">
          <span class="ta-print-meta__label">الشعبة</span>
          <span class="ta-print-meta__value">${esc(sectionName)}</span>
        </div>
      </div>
      <table class="ta-print-table">
        <thead>
          <tr><th>الوقت</th>${head}</tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="${colCount}" style="color:#5d6879;padding:4mm;">لا حصص</td></tr>`
          }
        </tbody>
      </table>
    </section>
  `;
}

const SCHEDULE_CONTENT_CSS = `
.grade-doc { margin-bottom: 5mm; }
.grade-doc + .grade-doc { page-break-before: auto; }
.stage-label {
  text-align: center;
  font-size: 10pt;
  font-weight: 800;
  color: var(--ta-print-gold, #c89a2b);
  margin: 0 0 3mm;
}
.ta-print-note .ok { margin: 1.5mm 0 0; color: #2e7d4f; font-weight: 700; }
.ta-print-note ul { margin: 1.5mm 0 0; padding-right: 4mm; }
.ta-print-note .warn { color: #a34b4b; margin-bottom: 1mm; }
.sig-stamp {
  width: 18mm;
  height: auto;
  display: block;
  margin: 0 auto 1.5mm;
}
`;

export function resolveSchedulePrintBranding(
  institute: InstituteSetting | null | undefined,
  settings: SchedulePrintSettings,
): PrintInstituteBranding {
  const base = brandingFromInstitute(institute);
  return {
    ...base,
    logoUrl: settings.showLogo
      ? settings.logoUrl || institute?.logo_url || null
      : null,
    directorName:
      settings.directorName.trim() || institute?.director_name?.trim() || null,
  };
}

export function buildScheduleGridPrintHtml(params: {
  grid: ScheduleGridResponse;
  settings: SchedulePrintSettings;
  institute?: InstituteSetting | null;
}): string {
  const { grid, settings, institute } = params;
  const branding = resolveSchedulePrintBranding(institute, settings);
  const director = branding.directorName || 'الاسم والتوقيع';

  const defaultTitle = grid.gender_label ? `جدول الحصص (${grid.gender_label})` : grid.title;
  const docTitle = settings.documentTitle.trim() || defaultTitle;

  const subtitle =
    settings.showPeriod && grid.period_name
      ? `الفترة الدراسية: ${grid.period_name}`
      : grid.subtitle || undefined;

  const grades = grid.grades ?? [];
  const stagesHtml = groupGradesByStage(grades)
    .map(([stageName, stageGrades]) => {
      const blocks = stageGrades
        .map((grade) => renderGradeBlock(grade, grid.day_columns))
        .join('');
      // Hide redundant stage heading when a single grade already shows stage in meta
      const showStageHeading = stageGrades.length > 1;
      return `
        <section class="stage-section">
          ${showStageHeading ? `<h2 class="stage-label">${esc(stageName)}</h2>` : ''}
          ${blocks}
        </section>
      `;
    })
    .join('');

  const notes = settings.showNotes
    ? `
      <div class="ta-print-note ta-print-avoid-break">
        <strong>ملاحظات:</strong>
        ${
          grid.has_conflicts
            ? `<ul>${(grid.conflicts ?? [])
                .map((c) => `<li class="warn">${esc(c.message)}</li>`)
                .join('')}</ul>`
            : '<div class="ok">لا توجد ملاحظات في الجدول.</div>'
        }
      </div>
    `
    : '';

  const stampHtml =
    settings.showSignature && institute?.stamp_url
      ? `<img src="${esc(institute.stamp_url)}" alt="" class="sig-stamp" />`
      : undefined;

  const contentHtml = `
    ${stagesHtml || '<p style="text-align:center;color:#5d6879;">لا توجد حصص للطباعة.</p>'}
    ${notes}
  `;

  return buildPrintableHtmlDocument({
    title: docTitle,
    subtitle,
    contentHtml,
    branding,
    showLogoFallback: settings.showLogo,
    showSignatures: settings.showSignature,
    signatures: [
      { title: 'إعداد', namePlaceholder: 'الاسم والتوقيع' },
      { title: 'اعتماد', namePlaceholder: director },
      {
        title: 'ختم المعهد',
        namePlaceholder: 'الختم الرسمي',
        mediaHtml: stampHtml,
      },
    ],
    documentLabel: 'وثيقة رسمية — للاستخدام الداخلي',
    extraCss: SCHEDULE_CONTENT_CSS,
    orientation: settings.orientation,
  });
}

export async function printScheduleGridHtml(params: {
  grid: ScheduleGridResponse;
  settings: SchedulePrintSettings;
  institute?: InstituteSetting | null;
  targetWindow?: Window | null;
}): Promise<void> {
  const html = buildScheduleGridPrintHtml(params);
  await printHtmlDocument(html, params.targetWindow);
}
