'use client';
import { useEffect, useState } from 'react';
import type { ViewId } from '@/types';
import Icon from './ui/Icon';
import { useMarketing, useSectionActive } from './MarketingProvider';
import { useSection } from '@/lib/marketing';

type AnnouncementsContent = {
  items: { id: string; icon: string; title: string; desc: string; cta_text: string; target_view: ViewId; bg_gradient: string }[];
};

/** Same content width as the hero (`max-w-[1560px]`), not full viewport. */
export default function AnnouncementBar({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const active = useSectionActive('announcements', { defaultBeforeLoad: false });
  const section = useSection<AnnouncementsContent>(useMarketing(), 'announcements');
  const announcements = active ? (section?.items ?? []) : [];
  const [i, setI] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hidden || announcements.length === 0) return;
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 6000);
    return () => clearInterval(t);
  }, [hidden, announcements.length]);

  if (!active || hidden || announcements.length === 0) return null;
  const a = announcements[i] ?? announcements[0];

  return (
    <div className="mx-auto flex w-full max-w-[1560px] items-center gap-2 px-4 py-2.5 sm:px-10">
      <button
        onClick={() => onNavigate(a.target_view)}
        style={{ background: a.bg_gradient }}
        className="flex min-w-0 flex-1 items-center justify-between gap-3.5 rounded-2xl border border-white/[.16] px-4 py-3 text-right text-white shadow-card transition-transform hover:-translate-y-0.5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon name={a.icon} className="shrink-0 text-lg" />
          <span className="min-w-0">
            <b className="block truncate text-[15px]">{a.title}</b>
            <span className="hidden truncate text-[12.5px] text-white/80 sm:block">{a.desc}</span>
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/[.18] px-3.5 py-1.5 text-[12.5px] font-bold">
          {a.cta_text}
        </span>
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label="إغلاق الإعلان"
        className="h-9 w-9 shrink-0 rounded-xl border border-gold/25 text-gold transition-colors hover:bg-white/5"
      >
        <Icon name="fa-solid fa-xmark" />
      </button>
      <div className="hidden shrink-0 gap-1.5 sm:flex">
        {announcements.map((x, n) => (
          <button
            key={x.id}
            onClick={() => setI(n)}
            aria-label={x.title}
            className={n === i ? 'h-1.5 w-5 rounded-full bg-gold' : 'h-1.5 w-1.5 rounded-full bg-white/25'}
          />
        ))}
      </div>
    </div>
  );
}
