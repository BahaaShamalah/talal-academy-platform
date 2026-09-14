'use client';

import { useQuery } from '@tanstack/react-query';
import { formFieldClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { IconField, MediaPicker } from '@/components/media/media-picker';
import type { MediaItem } from '@/lib/api-client';
import { fetchMediaList } from '@/lib/media';

export { IconField };

export function UnusedNote() {
  return (
    <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
      غير معروض بالموقع حاليًا
    </span>
  );
}

export function SectionBlock({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-cream-line bg-white">
      <div className="flex items-center gap-2 border-b border-[#f0ece1] bg-[#faf8f3] px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/[.16] text-gold-deep">
          <Icon name={icon} className="text-[12px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-extrabold text-ink">{title}</h2>
          {hint ? <p className="text-[11px] text-ink-dim">{hint}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2.5 p-3.5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  unused,
  multiline,
  dir,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unused?: boolean;
  multiline?: boolean;
  dir?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-semibold text-ink-soft">{label}</label>
      {multiline ? (
        <textarea
          className={`${formFieldClass} min-h-[64px] resize-y py-2 text-[13px]`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={`${formFieldClass} py-2 text-[13px] ${dir === 'ltr' ? 'font-latin' : ''}`}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? <p className="mt-0.5 text-[10.5px] text-ink-dim">{hint}</p> : null}
      {unused ? <UnusedNote /> : null}
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  unused,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  unused?: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-end rounded-xl border border-cream-line bg-[#faf8f3] px-3 py-2.5">
      <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {unused ? <UnusedNote /> : null}
    </div>
  );
}

export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list];
  const j = index + dir;
  if (j < 0 || j >= next.length) return list;
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function ImageField({
  label,
  value,
  url,
  mediaId,
  onPick,
  onClear,
}: {
  label: string;
  /** media id, absolute URL, or asset path */
  value?: string | number | null;
  url?: string | null;
  mediaId?: number | null;
  onPick: (media: MediaItem) => void;
  onClear?: () => void;
}) {
  const raw = value ?? mediaId ?? url ?? null;
  const numericId =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw)
        ? Number(raw)
        : null;
  const directUrl =
    typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('/'))
      ? raw
      : typeof url === 'string'
        ? url
        : null;

  const mediaQuery = useQuery({
    queryKey: ['media', 'lookup', numericId],
    queryFn: async () => {
      const { items } = await fetchMediaList({ per_page: 100 });
      return items.find((m) => m.id === numericId) ?? null;
    },
    enabled: numericId != null,
    staleTime: 60_000,
  });

  const resolvedUrl = directUrl || mediaQuery.data?.url || null;
  const resolvedId = numericId ?? mediaId ?? null;

  return (
    <MediaPicker
      label={label}
      valueId={resolvedId}
      valueUrl={resolvedUrl}
      onChange={onPick}
      onClear={onClear}
      compact
    />
  );
}

export function StringList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-gold-soft">
            {i + 1}
          </span>
          <input
            className={`${formFieldClass} flex-1 py-1.5 text-[13px]`}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 text-[10px] text-red-500"
          >
            <Icon name="fa-solid fa-trash" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/40 bg-gold/[.06] py-1.5 text-[12px] font-bold text-gold-deep"
      >
        <Icon name="fa-solid fa-plus" className="text-[10px]" />
        إضافة
      </button>
    </div>
  );
}

export function CardList({
  title,
  items,
  onChange,
  blank,
  render,
  itemLabel,
}: {
  title?: string;
  items: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
  blank: Record<string, unknown>;
  render: (item: Record<string, unknown>, i: number) => React.ReactNode;
  itemLabel?: (item: Record<string, unknown>, i: number) => string;
}) {
  return (
    <div className="space-y-2">
      {title ? (
        <div className="flex items-center justify-between">
          <h3 className="text-[12.5px] font-extrabold text-ink">{title}</h3>
          <span className="text-[11px] text-ink-dim">{items.length}</span>
        </div>
      ) : null}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-cream-line bg-white p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-gold-soft">
                  {i + 1}
                </span>
                <span className="truncate text-[12px] font-bold text-ink">
                  {itemLabel ? itemLabel(item, i) : `عنصر ${i + 1}`}
                </span>
              </div>
              <div className="flex gap-0.5">
                <IconBtn icon="fa-solid fa-chevron-up" disabled={i === 0} onClick={() => onChange(moveItem(items, i, -1))} />
                <IconBtn icon="fa-solid fa-chevron-down" disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, 1))} />
                <IconBtn icon="fa-solid fa-trash" danger onClick={() => onChange(items.filter((_, j) => j !== i))} />
              </div>
            </div>
            {render(item, i)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { ...blank }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/40 bg-gold/[.06] py-1.5 text-[12px] font-bold text-gold-deep"
      >
        <Icon name="fa-solid fa-plus" className="text-[10px]" />
        إضافة
      </button>
    </div>
  );
}

function IconBtn({
  icon,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] disabled:opacity-30 ${
        danger ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-cream-line text-ink-dim hover:bg-[#faf8f3]'
      }`}
    >
      <Icon name={icon} />
    </button>
  );
}
