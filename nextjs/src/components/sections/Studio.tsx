'use client';
import { useState } from 'react';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import Icon from '../ui/Icon';
import ImageFrame from '../ui/ImageFrame';
import { cn } from '@/lib/cn';

type AboutStudio = {
  studio_cats: { id: string; label: string }[];
  studio_items: { id: string; cat: string; title: string; ph: string; src?: string | null }[];
};

export default function Studio() {
  const about = useSection<AboutStudio>(useMarketing(), 'about');
  const [i, setI] = useState(0);
  if (!about) return null;
  const studioItems = about.studio_items ?? [];
  const studioCats = about.studio_cats ?? [];
  if (!studioItems.length) {
    return <p className="text-center text-[13px] text-muted-dim">لا توجد صور في الاستديو حالياً.</p>;
  }
  const total = studioItems.length;
  const cur = studioItems[i] ?? studioItems[0];
  const catLabel = studioCats.find((c) => c.id === cur.cat)?.label ?? '';

  const prev = () => setI((n) => (n - 1 + total) % total);
  const next = () => setI((n) => (n + 1) % total);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={prev}
          aria-label="السابق"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/35 bg-white/[.04] text-gold transition-colors hover:border-gold/55"
        >
          <Icon name="fa-solid fa-chevron-right" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="التالي"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy"
        >
          <Icon name="fa-solid fa-chevron-left" />
        </button>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-gold/30 bg-[#061a3a]/50 p-2">
        <div className="relative min-h-[220px] overflow-hidden rounded-[14px]" style={{ aspectRatio: '16 / 9' }}>
          <ImageFrame src={cur.src || undefined} placeholder={cur.ph} className="h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061a3a] via-[#061a3acc] to-transparent px-4 pb-3.5 pt-12 sm:px-5 sm:pb-4">
            <div className="text-[clamp(16px,2vw,20px)] font-extrabold">{cur.title}</div>
            <div className="mt-0.5 text-[12px] text-gold-soft">
              {catLabel} · <span className="font-latin">{i + 1} / {total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 sm:grid-cols-6">
        {studioItems.map((s, n) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setI(n)}
            aria-label={s.title}
            aria-current={n === i}
            className={cn(
              'relative overflow-hidden rounded-xl border-2 bg-white/[.03] transition-all',
              n === i ? 'border-gold ring-1 ring-gold/40' : 'border-white/10 opacity-65 hover:opacity-100',
            )}
            style={{ aspectRatio: '4 / 3' }}
          >
            <ImageFrame src={s.src || undefined} placeholder={s.ph} className="h-full w-full text-[9px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
