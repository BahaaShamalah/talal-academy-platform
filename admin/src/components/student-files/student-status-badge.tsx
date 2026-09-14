const MAP: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: 'نشط', bg: '#e9f3ec', fg: '#2e7d4f' },
  inactive: { label: 'غير نشط', bg: '#f4f1ea', fg: '#8a8478' },
  graduated: { label: 'متخرج', bg: '#f7f0e1', fg: '#8a6a20' },
};

export function StudentStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, bg: '#f4f1ea', fg: '#8a8478' };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function FileNumberBadge({ fileNumber }: { fileNumber: string }) {
  return (
    <span className="font-latin inline-block rounded-lg bg-navy px-2.5 py-1 text-[12px] font-bold tracking-wide text-gold-soft">
      {fileNumber}
    </span>
  );
}
