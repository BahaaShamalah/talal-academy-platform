'use client';

import Image from 'next/image';
import BrandMark from '../BrandMark';
import NavyBackdrop from './NavyBackdrop';
import Sara from './Sara';
import { cn } from '@/lib/cn';

type Props = {
  step: number;
  totalSteps: number;
  stepLabels: string[];
  mascotLine: string;
  guideName?: string;
  guideRole?: string;
  asideImage?: string | null;
};

export default function OnboardingAside({
  step,
  totalSteps,
  stepLabels,
  mascotLine,
  guideName = 'سارة',
  guideRole = 'مرشدة التسجيل',
  asideImage,
}: Props) {
  const ring = Math.round(339 - 339 * (step / Math.max(totalSteps, 1)));

  return (
    <aside className="onb-aside relative flex min-w-[320px] flex-1 basis-[460px] flex-col justify-between gap-[clamp(20px,2.6vw,34px)] overflow-hidden bg-[radial-gradient(120%_90%_at_74%_4%,#123163,#0b234a_46%,#061a3a_100%)] p-[clamp(26px,3.2vw,50px)] text-white">
      <NavyBackdrop />

      <div className="relative flex items-center justify-between gap-3">
        <BrandMark />
        <span className="font-latin whitespace-nowrap rounded-full border border-gold/[.28] bg-white/[.06] px-3.5 py-1.5 text-[11px] tracking-[.14em] text-muted-dim">
          {step} / {totalSteps}
        </span>
      </div>

      <div className="onb-hero relative flex flex-col items-center text-center">
        <div className="onb-char relative order-2 mt-6 w-[clamp(160px,18vw,220px)]">
          <svg viewBox="0 0 120 120" className="onb-ring pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2" fill="none">
            <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.09)" strokeWidth="3" />
            <circle
              cx="60" cy="60" r="54" stroke="url(#ringG)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="339" strokeDashoffset={ring} transform="rotate(-90 60 60)"
              className="transition-[stroke-dashoffset] duration-600 ease-[cubic-bezier(.2,.8,.2,1)]"
            />
            <defs>
              <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#c8a24a" />
                <stop offset="1" stopColor="#e2c67f" />
              </linearGradient>
            </defs>
          </svg>
          {asideImage ? (
            <Image
              src={asideImage}
              alt={guideName}
              width={220}
              height={260}
              className="relative h-auto w-full animate-floatY rounded-[22px] object-cover"
              unoptimized
            />
          ) : (
            <Sara className="relative h-auto w-full animate-floatY" />
          )}
        </div>

        <div key={step} className="onb-bubble pop relative order-1 max-w-[350px] overflow-hidden rounded-[20px] border border-gold/40 bg-white/[.08] px-5 py-4 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 animate-sheen bg-[linear-gradient(100deg,transparent,rgba(255,255,255,.13),transparent)]" />
          <div className="relative mb-2 flex items-center justify-center gap-2">
            <span className="font-display text-[14.5px] font-bold text-white">{guideName}</span>
            <span className="h-[5px] w-[5px] rounded-full bg-[#7fd6a3] shadow-[0_0_0_3px_rgba(127,214,163,.2)]" />
            <span className="text-[10.5px] text-muted-dim">{guideRole}</span>
          </div>
          <p className="relative m-0 text-[14.5px] leading-[1.8] text-[#f0e6cf]">{mascotLine}</p>
          <span className="onb-bubble-tail absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-gold/40 bg-white/[.08]" />
        </div>
      </div>

      <div className="onb-hide-sm relative flex flex-col gap-[7px]">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={`${label}-${i}`}
              className={cn(
                'flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 transition-all duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)]',
                active
                  ? '-translate-x-1 border border-gold/45 bg-gold/[.16] shadow-[0_12px_26px_-20px_#000]'
                  : done
                    ? 'bg-white/[.03]'
                    : '',
              )}
            >
              <span
                className={cn(
                  'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-all',
                  done
                    ? 'bg-gold text-[10px] text-navy'
                    : active
                      ? 'bg-gold/[.26] text-[7px] text-gold-soft'
                      : 'bg-white/[.06] text-[10px] text-[#6f7d9c]',
                )}
              >
                <i className={done ? 'fa-solid fa-check' : active ? 'fa-solid fa-circle' : 'fa-regular fa-circle'} />
              </span>
              <span
                className={cn(
                  'flex-1 text-[13.5px] transition-colors',
                  active ? 'font-bold text-white' : done ? 'font-medium text-muted' : 'font-medium text-[#6f7d9c]',
                )}
              >
                {label}
              </span>
              {(done || active) && (
                <span
                  className={cn(
                    'whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold',
                    done ? 'bg-[#7fd6a3]/[.16] text-[#7fd6a3]' : 'bg-gold text-navy',
                  )}
                >
                  {done ? 'تم' : 'الآن'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
