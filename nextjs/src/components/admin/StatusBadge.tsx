import type { EnrollmentStatus, SectionStatus } from '@/types/admin';

const MAP: Record<string, { label: string; bg: string; fg: string }> = {
  active:    { label: 'نشطة', bg: '#e9f3ec', fg: '#2e7d4f' },
  upcoming:  { label: 'قادمة', bg: '#eaf0f8', fg: '#1c4b8f' },
  done:      { label: 'مكتملة', bg: '#f0eef4', fg: '#5c4a7a' },
  cancelled: { label: 'ملغية', bg: '#f8ecec', fg: '#a34b4b' },
  confirmed: { label: 'مؤكد', bg: '#e9f3ec', fg: '#2e7d4f' },
  pending:   { label: 'بانتظار الدفع', bg: '#f7f0e1', fg: '#8a6a20' },
};

export default function StatusBadge({ status }: { status: SectionStatus | EnrollmentStatus }) {
  const s = MAP[status] ?? { label: status, bg: '#f4f1ea', fg: '#8a8478' };
  return (
    <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
