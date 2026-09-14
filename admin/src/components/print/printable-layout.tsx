'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiClient, type InstituteSetting } from '@/lib/api-client';
import { brandingFromInstitute } from '@/lib/print/branding';
import { OfficialPrintFooter } from '@/components/print/official-print-footer';
import { OfficialPrintHeader } from '@/components/print/official-print-header';
import type { PrintableLayoutProps } from '@/components/print/types';
import '@/components/print/print-a4.css';

/**
 * Master A4 printable shell — pass only document title + content.
 * Header/footer come from this layout (not per-template).
 */
export function PrintableLayout({
  title,
  subtitle,
  children,
  branding: brandingProp,
  showSignatures = true,
  signatures,
  documentLabel,
  className,
  pageClassName,
}: PrintableLayoutProps) {
  const settingsQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: () => apiClient<InstituteSetting>('/settings/institute'),
    staleTime: 60_000,
    enabled: brandingProp == null,
  });

  const branding =
    brandingProp ?? brandingFromInstitute(settingsQuery.data);

  return (
    <div className={cn('ta-print', className)} dir="rtl" lang="ar">
      <article className={cn('ta-print-page', pageClassName)}>
        <OfficialPrintHeader branding={branding} />

        <section className="ta-print-heading">
          <h1>{title}</h1>
          {subtitle ? <div className="ta-print-heading__sub">{subtitle}</div> : null}
        </section>

        <section className="ta-print-content">{children}</section>

        <OfficialPrintFooter
          branding={branding}
          showSignatures={showSignatures}
          signatures={signatures}
          documentLabel={documentLabel}
        />
      </article>
    </div>
  );
}
