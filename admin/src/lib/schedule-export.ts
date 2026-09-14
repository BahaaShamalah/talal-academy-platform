import { apiClient, qs, type InstituteSetting } from '@/lib/api-client';
import { openPrintPreviewWindow } from '@/lib/print/print-utils';
import {
  defaultPrintSettings,
  loadPrintSettings,
  printScheduleGridHtml,
  type SchedulePrintSettings,
} from '@/lib/schedule-grid-print';
import type { ScheduleGridResponse } from '@/lib/schedule-grid';

export type ScheduleExportFilters = {
  educational_stage_id?: number;
  grade_id?: number;
  grade_section_id?: number | 'none';
  subject_id?: number;
  gender?: 'male' | 'female';
  period_id?: number;
  preview?: boolean;
};

export function buildScheduleExportUrl(filters: ScheduleExportFilters = {}): string {
  return `/api/proxy/schedule-exports/pdf${qs({
    educational_stage_id: filters.educational_stage_id,
    grade_id: filters.grade_id,
    grade_section_id: filters.grade_section_id,
    subject_id: filters.subject_id,
    gender: filters.gender,
    period_id: filters.period_id,
    preview: filters.preview ? 1 : undefined,
  })}`;
}

export function buildScheduleGridFetchUrl(filters: ScheduleExportFilters = {}): string {
  return `/schedule-grid${qs({
    educational_stage_id: filters.educational_stage_id,
    grade_id: filters.grade_id,
    grade_section_id: filters.grade_section_id,
    subject_id: filters.subject_id,
    gender: filters.gender,
    period_id: filters.period_id,
  })}`;
}

/** PDF download (or inline preview) — uses official PDF blade. */
export function openScheduleExport(filters: ScheduleExportFilters, mode: 'download' | 'print'): void {
  const url = buildScheduleExportUrl({
    ...filters,
    preview: mode === 'print',
  });
  if (mode === 'print') {
    window.open(url, '_blank');
    return;
  }
  window.location.href = url;
}

/**
 * Official A4 HTML print for student schedule grids (عرض الجدول / إدارة الجداول).
 * Prefer this over opening the PDF for "طباعة".
 */
export async function printOfficialScheduleExport(params: {
  filters: ScheduleExportFilters;
  institute?: InstituteSetting | null;
  printSettings?: SchedulePrintSettings;
  /** Window opened synchronously on click via openPrintPreviewWindow(). */
  targetWindow?: Window | null;
}): Promise<void> {
  const preview = params.targetWindow ?? openPrintPreviewWindow();
  try {
    const grid = await apiClient<ScheduleGridResponse>(buildScheduleGridFetchUrl(params.filters));
    await printScheduleGridHtml({
      grid,
      settings: params.printSettings ?? loadPrintSettings() ?? defaultPrintSettings(),
      institute: params.institute,
      targetWindow: preview,
    });
  } catch (err) {
    try {
      preview.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}
