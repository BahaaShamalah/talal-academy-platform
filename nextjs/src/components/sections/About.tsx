'use client';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import SectionHeading from '../ui/SectionHeading';
import PageShell from '../ui/PageShell';
import Icon from '../ui/Icon';
import Studio from './Studio';

type AboutContent = {
  eyebrow: string;
  title: string;
  sub: string;
  why_us_title: string;
  info_section_title?: string;
  studio_section_sub?: string;
  days_label: string;
  hours_label: string;
  management_label: string;
  days_note: string;
  studio_title: string;
  benefits: { icon: string; title: string; desc: string }[];
};

type ContactSlice = {
  days: string;
  hours: string;
  management: string;
};

function AboutSection({
  icon,
  title,
  sub,
  children,
}: {
  icon: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-gold/22 bg-white/[.03]">
      <div className="border-b border-white/10 bg-white/[.02] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
            <Icon name={icon} />
          </span>
          <div>
            <h3 className="text-[18px] font-extrabold leading-snug">{title}</h3>
            {sub ? <p className="mt-1 text-[13px] leading-relaxed text-muted-dim">{sub}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function About() {
  const about = useSection<AboutContent>(useMarketing(), 'about');
  const contact = useSection<ContactSlice>(useMarketing(), 'contact');
  if (!about) return null;

  const info = [
    {
      icon: 'fa-solid fa-calendar-days',
      title: about.days_label,
      value: `${contact?.days ?? ''} ${about.days_note}`.trim(),
    },
    {
      icon: 'fa-solid fa-clock',
      title: about.hours_label,
      value: contact?.hours ?? '',
      latin: true,
    },
    {
      icon: 'fa-solid fa-user-tie',
      title: about.management_label,
      value: contact?.management ?? '',
    },
  ];

  return (
    <PageShell>
      <SectionHeading eyebrow={about.eyebrow} title={about.title} sub={about.sub} />

      <div className="space-y-5">
        <AboutSection icon="fa-solid fa-star" title={about.why_us_title}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {(about.benefits ?? []).map((b) => (
              <article
                key={b.title}
                className="group rounded-[16px] border border-gold/15 bg-[#0a1a38]/40 p-4 transition-colors hover:border-gold/35 hover:bg-white/[.04]"
              >
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gold/[.12] text-[17px] text-gold transition-transform group-hover:scale-105">
                  <Icon name={b.icon} />
                </div>
                <h4 className="text-[15px] font-bold">{b.title}</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-dim">{b.desc}</p>
              </article>
            ))}
          </div>
        </AboutSection>

        <AboutSection
          icon="fa-solid fa-building-columns"
          title={about.info_section_title || 'الدوام والإدارة'}
          sub="مواعيدنا وبيانات التواصل الرسمية للمعهد"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {info.map((item) => (
              <div
                key={item.title}
                className="flex gap-3 rounded-[16px] border border-gold/20 bg-gold/[.05] p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/80 text-gold">
                  <Icon name={item.icon} />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-gold-soft">{item.title}</div>
                  <div className={`mt-1 text-[14px] font-semibold text-[#f0e6cf] ${item.latin ? 'font-latin' : ''}`}>
                    {item.value || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AboutSection>

        <AboutSection
          icon="fa-solid fa-camera"
          title={about.studio_title || 'استديو المعهد'}
          sub={about.studio_section_sub || 'صور من فصولنا ومرافقنا وفعالياتنا'}
        >
          <Studio />
        </AboutSection>
      </div>
    </PageShell>
  );
}
