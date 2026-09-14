'use client';

import type { ReactNode } from 'react';
import { triggerPrint } from '@/lib/print/print-utils';
import '@/components/print/print-a4.css';

type Props = {
  children: ReactNode;
  /** Optional back link href (screen only) */
  backHref?: string;
  backLabel?: string;
};

/** Screen preview chrome: toolbar + gray canvas; hidden on print. */
export function PrintScreenShell({
  children,
  backHref = '/dashboard',
  backLabel = 'العودة',
}: Props) {
  return (
    <div className="ta-print ta-print-screen">
      <div className="ta-print-toolbar ta-print-no-print">
        <button type="button" className="ta-print-toolbar__btn" onClick={() => history.back()}>
          {backLabel}
        </button>
        {backHref ? (
          <a className="ta-print-toolbar__btn" href={backHref}>
            لوحة التحكم
          </a>
        ) : null}
        <button
          type="button"
          className="ta-print-toolbar__btn ta-print-toolbar__btn--primary"
          onClick={() => triggerPrint()}
        >
          طباعة
        </button>
        <p className="ta-print-toolbar__hint">معاينة A4 — عند الطباعة تُخفى الأزرار والخلفية</p>
      </div>
      {children}
    </div>
  );
}
