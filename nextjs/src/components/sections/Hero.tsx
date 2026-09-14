'use client';
import Image from 'next/image';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ImageFrame from '../ui/ImageFrame';
import type { ViewId } from '@/types';

type HeroContent = {
  badge_text: string;
  title_line1: string;
  title_line2: string;
  description: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  trust: string[];
  floating: { icon: string; label: string }[];
  heroFeatures: { icon: string; title: string; desc: string }[];
  background_image?: string | null;
  background_placeholder?: string;
  symbol_logo: string;
};

export default function Hero({
  onRegister, onExplore, onNavigate,
}: {
  onRegister: () => void;
  onExplore: () => void;
  onNavigate: (v: ViewId) => void;
}) {
  const h = useSection<HeroContent>(useMarketing(), 'hero');

  function handleCta(link: string) {
    if (link === 'register') onRegister();
    else if (link === 'programs') onExplore();
    else onNavigate(link as ViewId);
  }

  const symbol = h.symbol_logo || '/assets/talal-symbol-light.png';
  const symbolRemote = typeof symbol === 'string' && symbol.startsWith('http');
  const heroSrc = h.background_image || undefined;

  return (
    <section className="hero-bg app-pad relative flex min-h-[calc(100svh-70px)] flex-col overflow-hidden">
      <div className="dots-layer pointer-events-none absolute inset-0 opacity-40" />
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full animate-drift" fill="none">
        <circle cx="860" cy="240" r="300" stroke="rgba(212,169,54,.20)" strokeWidth="1.4" />
        <circle cx="860" cy="240" r="220" stroke="rgba(212,169,54,.12)" strokeWidth="1.4" />
        <path d="M120 760 A 700 700 0 0 1 820 60" stroke="rgba(212,169,54,.28)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="pointer-events-none absolute right-[2%] top-[4%] h-[64%] w-[48%] animate-glowPulse bg-[radial-gradient(55%_55%_at_62%_40%,rgba(212,169,54,.13),transparent_72%)]" />
      {symbolRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={symbol} alt="" className="pointer-events-none absolute -bottom-24 -left-32 w-[clamp(380px,42vw,640px)] opacity-[.06]" />
      ) : (
        <Image
          src={symbol}
          alt=""
          width={620}
          height={620}
          className="pointer-events-none absolute -bottom-24 -left-32 w-[clamp(380px,42vw,640px)] opacity-[.06]"
        />
      )}

      <div className="relative mx-auto flex w-full max-w-[1560px] flex-1 flex-wrap items-center content-center justify-center gap-[clamp(18px,3vw,40px)] px-4 py-[clamp(24px,3vw,48px)] text-center md:justify-start md:text-start sm:px-10">
        <div className="animate-fadeUp flex min-w-[280px] flex-1 basis-[340px] flex-col items-center md:items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-2 text-[13px] text-[#e7dcc3]">
            <Icon name="fa-solid fa-location-dot" className="text-gold" />
            {h.badge_text}
          </span>
          <h1 className="mt-5 text-[clamp(38px,5.6vw,84px)] font-black leading-[1.08] tracking-tight">
            {h.title_line1}
            <br />
            <span className="bg-gradient-to-l from-gold to-gold-soft bg-clip-text text-transparent">{h.title_line2}</span>
          </h1>
          <p className="mt-5 max-w-[500px] text-[clamp(15px,1.6vw,19px)] leading-[1.85] text-muted">
            {h.description}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3.5 md:justify-start">
            <Button size="lg" onClick={() => handleCta(h.cta_primary_link)}>
              {h.cta_primary_text}
            </Button>
            <Button size="lg" variant="outline" onClick={() => handleCta(h.cta_secondary_link)}>
              {h.cta_secondary_text}
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[14.5px] text-muted md:justify-start">
            {(h.trust ?? []).map((t) => (
              <span key={t} className="flex items-center gap-2">
                <b className="text-gold">✓</b> {t}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-img-col relative mx-auto min-h-[300px] min-w-[280px] w-full flex-1 basis-[420px] md:mx-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] shadow-[0_50px_90px_-40px_#000] md:rounded-l-[32px] md:rounded-r-none">
            <ImageFrame
              src={heroSrc}
              placeholder={h.background_placeholder || 'صورة طلاب في بيئة تعليمية (4:3)'}
              className="absolute inset-0 h-full w-full"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(6,26,58,1),transparent_36%),linear-gradient(270deg,rgba(6,26,58,1)_0%,transparent_24%)]" />
          </div>

          <div className="absolute left-2 top-14 hidden animate-floatY flex-col gap-3.5 sm:flex">
            {(h.floating ?? []).map((f, i) => (
              <div key={f.icon + i} className={`glass w-[112px] rounded-2xl p-3.5 text-center shadow-card ${i === 2 ? 'hidden lg:block' : ''}`}>
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-[10px] bg-gold/[.16] text-[15px] text-gold">
                  <Icon name={f.icon} />
                </span>
                <div className="mt-2 whitespace-pre-line text-[12px] font-bold leading-relaxed">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1560px] px-4 pb-[clamp(20px,3vw,40px)] sm:px-10">
        <div className="grid grid-cols-2 gap-4 rounded-[22px] border border-gold/[.22] bg-white/[.04] p-[clamp(16px,2vw,26px)] sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] sm:gap-5">
          {(h.heroFeatures ?? []).map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col items-center gap-2.5 text-center sm:flex-row sm:items-center sm:gap-3.5 sm:text-start ${i ? 'sm:border-r sm:border-white/10 sm:pr-5' : ''}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/[.14] text-[17px] text-gold">
                <Icon name={f.icon} />
              </span>
              <div>
                <div className="text-[15px] font-bold">{f.title}</div>
                <div className="text-[12px] text-muted-dim">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
