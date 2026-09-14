import type { PrintInstituteBranding, PrintSignatureSlot } from '@/components/print/types';
import { PRINT_A4_CSS } from '@/lib/print/print-a4-css';

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function headerHtml(b: PrintInstituteBranding, showLogoFallback = true): string {
  const logo = b.logoUrl
    ? `<img class="ta-print-logo" src="${esc(b.logoUrl)}" alt="${esc(b.nameEn || b.nameAr || 'Logo')}" />`
    : showLogoFallback
      ? `<div class="ta-print-logo-fallback">TA</div>`
      : '';

  const enLines = [
    b.nameEn ? `<div class="ta-print-name-en">${esc(b.nameEn)}</div>` : '',
    b.descriptorEn ? `<p class="ta-print-line">${esc(b.descriptorEn)}</p>` : '',
    b.address ? `<p class="ta-print-line">${esc(b.address)}</p>` : '',
    b.phone ? `<p class="ta-print-line ta-print-line--muted">Tel: ${esc(b.phone)}</p>` : '',
    b.email ? `<p class="ta-print-line ta-print-line--muted">Email: ${esc(b.email)}</p>` : '',
  ].join('');

  const arLines = [
    b.nameAr ? `<div class="ta-print-name-ar">${esc(b.nameAr)}</div>` : '',
    b.descriptorAr ? `<p class="ta-print-line">${esc(b.descriptorAr)}</p>` : '',
    b.address ? `<p class="ta-print-line">${esc(b.address)}</p>` : '',
    b.phone ? `<p class="ta-print-line ta-print-line--muted">هاتف: ${esc(b.phone)}</p>` : '',
    b.email ? `<p class="ta-print-line ta-print-line--muted">البريد: ${esc(b.email)}</p>` : '',
  ].join('');

  return `
<header>
  <div class="ta-print-header-grid">
    <section class="ta-print-side ta-print-side--en">${enLines}</section>
    <div>${logo}</div>
    <section class="ta-print-side ta-print-side--ar">${arLines}</section>
  </div>
  <div class="ta-print-gold-rule"></div>
</header>`;
}

function footerHtml(
  b: PrintInstituteBranding,
  opts?: {
    showSignatures?: boolean;
    signatures?: PrintSignatureSlot[];
    documentLabel?: string;
  },
): string {
  const show = opts?.showSignatures !== false;
  const slots =
    opts?.signatures && opts.signatures.length > 0
      ? opts.signatures
      : [
          { title: 'إعداد', namePlaceholder: 'الاسم والتوقيع' },
          { title: 'اعتماد', namePlaceholder: 'الاسم والتوقيع' },
          { title: 'ختم المعهد', namePlaceholder: 'الختم الرسمي' },
        ];
  const label = opts?.documentLabel ?? 'وثيقة رسمية — للاستخدام الداخلي';

  const sig = show
    ? `<div class="ta-print-signatures ta-print-avoid-break">${slots
        .map(
          (s) => `
      <div class="ta-print-signature">
        <div class="ta-print-signature__title">${esc(s.title)}</div>
        ${s.mediaHtml ?? ''}
        <div class="ta-print-signature__line"></div>
        <div class="ta-print-signature__name">${esc(s.namePlaceholder ?? 'الاسم والتوقيع')}</div>
      </div>`,
        )
        .join('')}</div>`
    : '';

  return `
<footer class="ta-print-footer">
  ${sig}
  <div class="ta-print-footer-row">
    <span class="ta-print-footer-row__brand">${esc(b.nameAr || '—')}</span>
    <span>${esc(label)}</span>
    <span>${esc(b.nameEn || '—')}</span>
  </div>
</footer>`;
}

/** Build a full A4 HTML document using the shared official shell (for iframe printers). */
export function buildPrintableHtmlDocument(params: {
  title: string;
  subtitle?: string;
  contentHtml: string;
  branding: PrintInstituteBranding;
  showSignatures?: boolean;
  signatures?: PrintSignatureSlot[];
  documentLabel?: string;
  /** Extra CSS for template-specific content (tables, etc.) */
  extraCss?: string;
  orientation?: 'portrait' | 'landscape';
  /** When false and no logoUrl, leave center empty (no TA fallback). */
  showLogoFallback?: boolean;
}): string {
  const {
    title,
    subtitle,
    contentHtml,
    branding,
    showSignatures,
    signatures,
    documentLabel,
    extraCss = '',
    orientation = 'portrait',
    showLogoFallback = true,
  } = params;

  const orientationCss =
    orientation === 'landscape'
      ? `@page { size: A4 landscape; margin: 0; } .ta-print-page { width: 297mm; min-height: 210mm; }`
      : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>${PRINT_A4_CSS}
${orientationCss}
${extraCss}</style>
</head>
<body class="ta-print">
  <main class="ta-print-page">
    ${headerHtml(branding, showLogoFallback)}
    <section class="ta-print-heading">
      <h1>${esc(title)}</h1>
      ${subtitle ? `<div class="ta-print-heading__sub">${esc(subtitle)}</div>` : ''}
    </section>
    <section class="ta-print-content">${contentHtml}</section>
    ${footerHtml(branding, { showSignatures, signatures, documentLabel })}
  </main>
</body>
</html>`;
}
