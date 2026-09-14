'use client';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: string;
  title: string;
  body: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-dashed border-[#ded5c2] bg-cream-soft text-[26px] text-gold">
        <Icon name={icon} />
      </div>
      <h3 className="font-display mt-4 text-[19px] font-bold text-navy-800">{title}</h3>
      <p className="mx-auto mb-5 mt-1.5 max-w-[330px] text-[13.5px] leading-[1.8] text-ink-dim">{body}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {primary ? (
          <button
            type="button"
            onClick={primary.onClick}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy transition-transform hover:-translate-y-0.5"
          >
            <Icon name="fa-solid fa-plus" className="text-[12px]" /> {primary.label}
          </button>
        ) : null}
        {secondary ? (
          <button
            type="button"
            onClick={secondary.onClick}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className={cn('h-9 flex-1 animate-pulse rounded-lg bg-[#f0ece1]', j === 0 && 'min-w-[140px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
