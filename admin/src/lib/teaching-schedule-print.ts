import type { TeachingSchedulePayload, TeachingScheduleSession, TeachingScheduleView } from '@/lib/api-client';
import type { InstituteSetting } from '@/lib/api-client';
import { brandingFromInstitute } from '@/lib/print/branding';
import { buildPrintableHtmlDocument } from '@/lib/print/build-printable-html';
import { openPrintPreviewWindow, printHtmlDocument } from '@/lib/print/print-utils';
import { qs } from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function titleForView(view: TeachingScheduleView): string {
  if (view === 'day') return 'جدول الحصص اليومي';
  if (view === 'month') return 'جدول الحصص الشهري';
  return 'جدول الحصص الأسبوعي';
}

function subtitleForMeta(meta: TeachingSchedulePayload['meta']): string {
  const start = parseIso(meta.range_start).toLocaleDateString('ar-KW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (meta.range_start === meta.range_end) return start;
  const end = parseIso(meta.range_end).toLocaleDateString('ar-KW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${start} — ${end}`;
}

function dayHeading(iso: string): string {
  return parseIso(iso).toLocaleDateString('ar-KW', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function groupSessionsByDate(sessions: TeachingScheduleSession[]): Array<[string, TeachingScheduleSession[]]> {
  const map = new Map<string, TeachingScheduleSession[]>();
  for (const s of sessions) {
    const list = map.get(s.session_date) ?? [];
    list.push(s);
    map.set(s.session_date, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const CONTENT_CSS = `
.day-block { margin-bottom: 3.5mm; break-inside: avoid; page-break-inside: avoid; }
.day-title {
  background: var(--ta-print-navy, #071d41);
  color: var(--ta-print-gold, #c89a2b);
  font-weight: 800;
  font-size: 9.5pt;
  padding: 2mm 3mm;
}
.sessions { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.sessions th {
  background: #f3f4f6;
  color: var(--ta-print-navy, #071d41);
  padding: 2mm 1.5mm;
  border: 0.3mm solid var(--ta-print-line, #d8dde5);
}
.sessions td {
  padding: 2.2mm 1.5mm;
  border: 0.3mm solid var(--ta-print-line, #d8dde5);
  text-align: center;
  vertical-align: middle;
}
.sessions td.subject { text-align: right; font-weight: 700; color: var(--ta-print-navy, #071d41); }
.sessions tr:nth-child(even) td { background: #fafbfc; }
.sessions tr.cancelled td { color: #a34b4b; text-decoration: line-through; }
.empty { text-align: center; color: #8a8478; padding: 4mm; font-size: 9pt; }
.time { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
.teacher-line { text-align: center; color: var(--ta-print-muted, #4f5766); font-size: 9pt; margin: -2mm 0 3mm; }
`;

export function buildTeachingSchedulePrintHtml(params: {
  payload: TeachingSchedulePayload;
  institute?: InstituteSetting | null;
  teacherName?: string | null;
}): string {
  const { payload, institute, teacherName } = params;
  const branding = brandingFromInstitute(institute);
  const title = titleForView(payload.meta.view);
  const subtitle = subtitleForMeta(payload.meta);

  const daysHtml = groupSessionsByDate(payload.sessions)
    .map(([iso, sessions]) => {
      const rows = sessions
        .map((s) => {
          const cancelled = s.status === 'cancelled';
          return `<tr class="${cancelled ? 'cancelled' : ''}">
            <td class="time">${esc(formatTimeRange12h(s.start_time, s.end_time))}</td>
            <td class="subject">${esc(s.subject_name ?? 'حصة')}</td>
            <td>${esc(s.hall_name ?? '—')}</td>
            <td>${cancelled ? 'ملغاة' : 'مجدولة'}</td>
          </tr>`;
        })
        .join('');

      return `<section class="day-block">
        <div class="day-title">${esc(dayHeading(iso))}</div>
        <table class="sessions">
          <thead><tr><th>الوقت</th><th>المادة</th><th>القاعة</th><th>الحالة</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const contentHtml = `
    ${teacherName ? `<div class="teacher-line">المعلم: ${esc(teacherName)}</div>` : ''}
    ${daysHtml || '<p class="empty">لا توجد حصص في هذه الفترة.</p>'}
  `;

  return buildPrintableHtmlDocument({
    title,
    subtitle,
    contentHtml,
    branding,
    documentLabel: 'جدول معلم رسمي',
    extraCss: CONTENT_CSS,
    signatures: [
      { title: 'إعداد', namePlaceholder: 'الاسم والتوقيع' },
      { title: 'اعتماد', namePlaceholder: teacherName || branding.directorName || 'الاسم والتوقيع' },
      { title: 'ختم المعهد', namePlaceholder: 'الختم الرسمي' },
    ],
  });
}

export async function printTeachingSchedule(params: {
  payload: TeachingSchedulePayload;
  institute?: InstituteSetting | null;
  teacherName?: string | null;
  targetWindow?: Window | null;
}): Promise<void> {
  const preview = params.targetWindow ?? openPrintPreviewWindow();
  try {
    const html = buildTeachingSchedulePrintHtml(params);
    await printHtmlDocument(html, preview);
  } catch (err) {
    try {
      preview.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export function buildTeachingSchedulePdfUrl(params: {
  view: TeachingScheduleView;
  date: string;
  preview?: boolean;
}): string {
  return `/api/proxy/me/teaching-schedule/pdf${qs({
    view: params.view,
    date: params.date,
    preview: params.preview ? 1 : undefined,
  })}`;
}

export function openTeachingScheduleExport(
  params: { view: TeachingScheduleView; date: string },
  mode: 'download' | 'preview',
): void {
  const url = buildTeachingSchedulePdfUrl({
    ...params,
    preview: mode === 'preview',
  });
  if (mode === 'preview') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = url;
}
