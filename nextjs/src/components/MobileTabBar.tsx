'use client';
import type { ViewId } from '@/types';
import Icon from './ui/Icon';
import { cn } from '@/lib/cn';
import { useMarketing } from './MarketingProvider';
import { useSection } from '@/lib/marketing';

type NavContent = {
  tab_items: { view_id: ViewId; label: string; icon?: string }[];
};

export default function MobileTabBar({ view, onNavigate }: { view: ViewId; onNavigate: (v: ViewId) => void }) {
  const nav = useSection<NavContent>(useMarketing(), 'nav');
  if (!nav) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[55] grid grid-cols-5 border-t border-gold/[.28] bg-navy px-1.5 pt-2 shadow-[0_-10px_30px_-18px_#000] lg:hidden"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
    >
      {(nav.tab_items ?? []).map((t) => {
        const active = view === t.view_id;
        return (
          <button
            key={t.view_id}
            onClick={() => onNavigate(t.view_id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl py-1.5 transition-all',
              active ? 'bg-gold/[.14] text-gold-soft' : 'text-[#93a0bd]',
            )}
          >
            <Icon name={t.icon!} className="text-[17px]" />
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
