import type { ReactNode } from 'react';

/** Institute branding resolved from settings (never invent production values). */
export type PrintInstituteBranding = {
  nameAr: string;
  nameEn: string;
  /** Optional Arabic descriptor line under the name */
  descriptorAr?: string | null;
  /** Optional English descriptor line under the name */
  descriptorEn?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  directorName?: string | null;
};

export type PrintSignatureSlot = {
  title: string;
  namePlaceholder?: string;
  /** Trusted HTML only (e.g. institute stamp image) — not user free text */
  mediaHtml?: string;
};

export type PrintableLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Override branding; when omitted, layout loads `/settings/institute`. */
  branding?: PrintInstituteBranding | null;
  /** Hide official signature block */
  showSignatures?: boolean;
  signatures?: PrintSignatureSlot[];
  /** Footer center label */
  documentLabel?: string;
  className?: string;
  /** Extra class on the A4 page sheet */
  pageClassName?: string;
};
