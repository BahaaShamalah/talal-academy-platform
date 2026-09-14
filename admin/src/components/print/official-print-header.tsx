'use client';

import type { ReactNode } from 'react';
import type { PrintInstituteBranding } from '@/components/print/types';

type Props = {
  branding: PrintInstituteBranding;
};

function Line({ children, muted }: { children: ReactNode; muted?: boolean }) {
  if (children == null || children === '') return null;
  return <p className={`ta-print-line${muted ? ' ta-print-line--muted' : ''}`}>{children}</p>;
}

export function OfficialPrintHeader({ branding }: Props) {
  const {
    nameAr,
    nameEn,
    descriptorAr,
    descriptorEn,
    address,
    phone,
    email,
    logoUrl,
  } = branding;

  return (
    <header>
      <div className="ta-print-header-grid">
        <section className="ta-print-side ta-print-side--en" aria-label="English institute information">
          {nameEn ? <div className="ta-print-name-en">{nameEn}</div> : null}
          <Line>{descriptorEn}</Line>
          <Line>{address}</Line>
          <Line muted>{phone ? `Tel: ${phone}` : null}</Line>
          <Line muted>{email ? `Email: ${email}` : null}</Line>
        </section>

        <div>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ta-print-logo" src={logoUrl} alt={nameEn || nameAr || 'Logo'} />
          ) : (
            <div className="ta-print-logo-fallback" aria-hidden>
              TA
            </div>
          )}
        </div>

        <section className="ta-print-side ta-print-side--ar" aria-label="بيانات المعهد بالعربية">
          {nameAr ? <div className="ta-print-name-ar">{nameAr}</div> : null}
          <Line>{descriptorAr}</Line>
          <Line>{address}</Line>
          <Line muted>{phone ? `هاتف: ${phone}` : null}</Line>
          <Line muted>{email ? `البريد: ${email}` : null}</Line>
        </section>
      </div>
      <div className="ta-print-gold-rule" />
    </header>
  );
}
