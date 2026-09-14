import { qs } from '@/lib/api-client';
import type { ClassOfferingGender } from '@/lib/api-client';

export type ScheduleGridDayKey = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday';

export type ScheduleGridDayColumn = {
  key: ScheduleGridDayKey;
  label: string;
};

export type ScheduleGridTimeslot = {
  time_range: string;
  start_time: string;
  end_time: string;
  days: Record<ScheduleGridDayKey, string | null>;
};

export type ScheduleGridGrade = {
  grade_id: number;
  grade_name: string;
  stage_name: string | null;
  grade_section_id: number | null;
  grade_section_name: string | null;
  grade_section_gender?: ClassOfferingGender | null;
  timeslots: ScheduleGridTimeslot[];
};

export type ScheduleGridConflict = {
  grade_name: string;
  grade_section_name?: string | null;
  time_range: string;
  day_label: string;
  message: string;
};

export type ScheduleGridResponse = {
  gender: ClassOfferingGender | null;
  gender_label: string | null;
  period_id: number | null;
  period_name: string | null;
  title: string;
  subtitle: string | null;
  day_columns: ScheduleGridDayColumn[];
  grades: ScheduleGridGrade[];
  has_conflicts?: boolean;
  conflicts?: ScheduleGridConflict[];
  notes?: string[];
};

export type ScheduleGridFilters = {
  educational_stage_id?: number;
  grade_id?: number;
  grade_section_id?: number | 'none';
  subject_id?: number;
  gender?: ClassOfferingGender;
  period_id?: number;
};

export function buildScheduleGridUrl(filters: ScheduleGridFilters = {}): string {
  return `/schedule-grid${qs({
    educational_stage_id: filters.educational_stage_id,
    grade_id: filters.grade_id,
    grade_section_id: filters.grade_section_id,
    subject_id: filters.subject_id,
    gender: filters.gender,
    period_id: filters.period_id,
  })}`;
}

/** @deprecated Prefer buildScheduleGridUrl({ gender }) */
export function buildScheduleGridUrlByGender(gender: ClassOfferingGender, periodId?: number): string {
  return buildScheduleGridUrl({ gender, period_id: periodId });
}
