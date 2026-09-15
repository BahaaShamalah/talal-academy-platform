'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { ViewId } from '@/types';
import Icon from './ui/Icon';
import { useMarketing } from './MarketingProvider';
import { useSection } from '@/lib/marketing';

const SOCIAL_ICONS: Record<string, string> = {
  whatsapp: 'fa-brands fa-whatsapp',
  instagram: 'fa-brands fa-instagram',
  snapchat: 'fa-brands fa-snapchat',
  'x-twitter': 'fa-brands fa-x-twitter',
};

/** Always shown — CMS links may be outdated (#) from older content. */
const DEFAULT_LEGAL_LINKS = [
  { label: 'سياسة الخصوصية', url: '/privacy' },
  { label: 'الشروط والأحكام', url: '/terms' },
  { label: 'سياسة الاسترجاع', url: '/refund-policy' },
];

type NavContent = {
  institute_name_ar: string;
  institute_name_en: string;
  footer_paragraph: string;
  footer_links_title: string;
  footer_contact_title: string;
  footer_hours_title: string;
  footer_management_prefix: string;
  footer_copyright: string;
  nav_items: { view_id: ViewId; label: string }[];
  footer_legal_links: { label: string; url: string }[];
  social_links: { platform: string; url: string }[];
};

type ContactSlice = {
  country: string;
  management: string;
  phones: string[];
  days: string;
  hours: string;
};

/** Original 4-column footer: brand · links · contact · hours */
export default function Footer({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const nav = useSection<NavContent>(useMarketing(), 'nav');
  const contact = useSection<ContactSlice>(useMarketing(), 'contact');

  if (!nav) return null;

  const legalLinks = DEFAULT_LEGAL_LINKS;

  return (
    <footer className="app-pad border-t border-gold/[.18] bg-navy px-4 py-10 sm:px-8">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 lg:grid-cols-4">
        {/* 1 — الهوية */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Image src="/assets/talal-symbol-light.png" alt="" width={40} height={40} />
            <span className="flex flex-col leading-none">
              <b className="text-[18px]">{nav.institute_name_ar}</b>
              <span className="mt-1 font-[Marcellus,serif] text-[8px] tracking-[.24em] text-gold-soft">
                {nav.institute_name_en}
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted-dim">
            {nav.footer_paragraph}
            {contact?.country ? ` — ${contact.country}` : ''}
          </p>
          {contact?.management ? (
            <p className="mt-3 text-[13px] text-muted">
              {nav.footer_management_prefix}{' '}
              <b className="font-display text-[15px] text-white">{contact.management}</b>
            </p>
          ) : null}
        </div>

        {/* 2 — روابط */}
        <div>
          <h3 className="mb-3 text-[13px] font-bold tracking-wide text-gold">
            {nav.footer_links_title || 'روابط'}
          </h3>
          <ul className="space-y-2 text-[14px] text-muted">
            {(nav.nav_items ?? []).map((n) => (
              <li key={n.view_id}>
                <button type="button" onClick={() => onNavigate(n.view_id)} className="hover:text-gold">
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 3 — تواصل */}
        <div>
          <h3 className="mb-3 text-[13px] font-bold tracking-wide text-gold">
            {nav.footer_contact_title || 'تواصل'}
          </h3>
          <ul className="space-y-2 text-[14px] text-muted">
            {(contact?.phones ?? []).map((p) => (
              <li key={p}>
                <a href={`tel:${p}`} className="font-latin font-bold text-gold-soft hover:text-gold" dir="ltr">
                  {p}
                </a>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => onNavigate('contact')} className="hover:text-gold">
                تواصل معنا
              </button>
            </li>
          </ul>
        </div>

        {/* 4 — الدوام */}
        <div>
          <h3 className="mb-3 text-[13px] font-bold tracking-wide text-gold">
            {nav.footer_hours_title || 'الدوام'}
          </h3>
          <p className="text-[14px] leading-loose text-muted">
            {contact?.days}
            <br />
            <span className="font-latin">{contact?.hours}</span>
          </p>
          <div className="mt-4 flex gap-3 text-lg text-gold">
            {(nav.social_links ?? []).map((s) => {
              const icon = SOCIAL_ICONS[s.platform] ?? 'fa-solid fa-link';
              return s.url ? (
                <a key={s.platform} href={s.url} target="_blank" rel="noreferrer">
                  <Icon name={icon} />
                </a>
              ) : (
                <Icon key={s.platform} name={icon} />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[12px] text-muted-dim">
        <span className="font-latin">
          © {new Date().getFullYear()} {nav.footer_copyright}
        </span>
        <span className="flex flex-wrap gap-4">
          {legalLinks.map((l) => (
            <Link key={l.url} href={l.url} className="hover:text-gold">
              {l.label}
            </Link>
          ))}
        </span>
      </div>
    </footer>
  );
}
