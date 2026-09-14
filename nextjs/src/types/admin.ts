export type SectionStatus = 'active' | 'upcoming' | 'done' | 'cancelled';
export type EnrollmentStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Stat {
  icon: string;
  value: string;
  label: string;
  note: string;
  trend: string;
  trendDir: 'up' | 'flat';
}

export interface Section {
  id: string;
  code: string;
  name: string;
  course: string;
  teacher: string;
  room: string;
  filled: number;
  capacity: number;
  startDate: string;
  endDate: string;
  status: SectionStatus;
}

export interface Enrollment {
  id: string;
  student: string;
  section: string;
  date: string;
  amount: string;
  status: EnrollmentStatus;
}

export interface Lesson {
  subject: string;
  teacher: string;
  room: string;
}

export interface TodayLesson extends Lesson {
  time: string;
}

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}
