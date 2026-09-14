'use client';

import type { PrintInstituteBranding, PrintSignatureSlot } from '@/components/print/types';

const DEFAULT_SIGNATURES: PrintSignatureSlot[] = [
  { title: 'إعداد', namePlaceholder: 'الاسم والتوقيع' },
  { title: 'اعتماد', namePlaceholder: 'الاسم والتوقيع' },
  { title: 'ختم المعهد', namePlaceholder: 'الختم الرسمي' },
];

type Props = {
  branding: PrintInstituteBranding;
  showSignatures?: boolean;
  signatures?: PrintSignatureSlot[];
  documentLabel?: string;
};

export function OfficialPrintFooter({
  branding,
  showSignatures = true,
  signatures = DEFAULT_SIGNATURES,
  documentLabel = 'وثيقة رسمية — للاستخدام الداخلي',
}: Props) {
  const slots = signatures.length > 0 ? signatures : DEFAULT_SIGNATURES;

  return (
    <footer className="ta-print-footer">
      {showSignatures ? (
        <div className="ta-print-signatures ta-print-avoid-break">
          {slots.map((slot) => (
            <div key={slot.title} className="ta-print-signature">
              <div className="ta-print-signature__title">{slot.title}</div>
              {slot.mediaHtml ? (
                <div dangerouslySetInnerHTML={{ __html: slot.mediaHtml }} />
              ) : null}
              <div className="ta-print-signature__line" />
              <div className="ta-print-signature__name">
                {slot.namePlaceholder ?? 'الاسم والتوقيع'}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="ta-print-footer-row">
        <span className="ta-print-footer-row__brand">{branding.nameAr || '—'}</span>
        <span>{documentLabel}</span>
        <span>{branding.nameEn || '—'}</span>
      </div>
    </footer>
  );
}
