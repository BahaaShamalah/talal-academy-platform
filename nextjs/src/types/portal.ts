export type LoginRole = 'parent' | 'student' | 'teacher';

export interface Stage { id: string; name: string; desc: string; icon: string; }
export interface Grade { id: string; st: string; stage: string; name: string; }
export interface Subject { id: string; name: string; icon: string; price: number; }
export interface PayMethod { id: 'full' | 'installments' | 'onsite'; name: string; desc: string; icon: string; }

export interface EnrollmentDraft {
  stage: string | null;
  grade: string | null;
  subjects: string[];
  pay: PayMethod['id'];
  parent: { name: string; phone: string; email: string; relation: string };
  student: { name: string; school: string; group: string; note: string };
}

export interface PortalChild { id: string; name: string; grade: string; initial: string; }
export interface StatTile { icon: string; value: string; label: string; trend: string; up: boolean; pct: number; color: string; }
export interface SubjectScore { name: string; icon: string; score: number; color: string; }
export interface Lesson { subject: string; teacher: string; room: string; time?: string; color?: string; }
export interface HomeworkItem {
  title: string; subject: string; teacher: string; due: string; dueLabel: string;
  state: 'pending' | 'done' | 'late'; icon: string;
}
export interface ReportRow { name: string; icon: string; exams: string; hw: string; att: string; grade: string; tone: 'good' | 'mid'; }
export interface TeacherNote { teacher: string; date: string; text: string; }
export interface Invoice { no: string; date: string; method: string; amount: string; status: string; ok: boolean; }
