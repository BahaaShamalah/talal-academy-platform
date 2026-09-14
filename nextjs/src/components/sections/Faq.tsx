'use client';
import { useState } from 'react';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import SectionHeading from '../ui/SectionHeading';
import PageShell from '../ui/PageShell';
import Icon from '../ui/Icon';
import { cn } from '@/lib/cn';

type FaqContent = {
  page_eyebrow: string;
  page_title: string;
  faqs: { q: string; a: string }[];
};

export default function Faq() {
  const faq = useSection<FaqContent>(useMarketing(), 'faq');
  const [open, setOpen] = useState(0);
  if (!faq) return null;
  const items = faq.faqs ?? [];

  return (
    <PageShell>
      <SectionHeading eyebrow={faq.page_eyebrow} title={faq.page_title} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={`${f.q}-${i}`}
              className={cn(
                'animate-fadeUp self-start overflow-hidden rounded-[18px] border transition-colors duration-300',
                isOpen
                  ? 'border-gold/45 bg-gradient-to-br from-white/[.07] to-white/[.02] shadow-[0_20px_40px_-28px_rgba(0,0,0,.7)] lg:col-span-2'
                  : 'border-gold/15 bg-white/[.03] hover:border-gold/30',
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3.5 p-4 text-right sm:gap-4 sm:p-5"
              >
                <span
                  className={cn(
                    'font-latin flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold transition-colors',
                    isOpen ? 'bg-gold text-navy' : 'bg-gold/[.14] text-gold',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug sm:text-[16px]">{f.q}</span>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[12px] transition-all duration-300',
                    isOpen
                      ? 'rotate-180 border-gold/50 bg-gold/[.18] text-gold'
                      : 'border-white/15 bg-white/[.04] text-muted',
                  )}
                >
                  <Icon name="fa-solid fa-chevron-down" />
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-white/10 px-4 pb-5 pt-1 sm:px-5 sm:ps-[4.25rem]">
                    <p className="max-w-4xl text-[14px] leading-[1.9] text-muted sm:text-[15px]">{f.a}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
