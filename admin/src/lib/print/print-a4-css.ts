/**
 * Official A4 print CSS — dimensions match talal-academy-a4-print-template exactly.
 * Keep in sync with components/print/print-a4.css
 */
export const PRINT_A4_CSS = `
@page { size: A4 portrait; margin: 0; }

* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

html, body {
  margin: 0;
  padding: 0;
  background: #e9edf2;
  color: #17243a;
  font-family: "Cairo", Tahoma, Arial, sans-serif;
}

.ta-print {
  --ta-print-navy: #071d41;
  --ta-print-gold: #c89a2b;
  --ta-print-text: #17243a;
  --ta-print-muted: #5d6879;
  --ta-print-line: #d8dde5;
}

.ta-print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm 14mm 10mm;
  background: #fff;
  display: flex;
  flex-direction: column;
  color: var(--ta-print-text);
}

.ta-print-header-grid {
  direction: ltr;
  display: grid;
  grid-template-columns: 1fr 46mm 1fr;
  align-items: center;
  column-gap: 6mm;
  min-height: 44mm;
}

.ta-print-logo {
  width: 42mm;
  height: auto;
  max-height: 42mm;
  display: block;
  margin: 0 auto;
  object-fit: contain;
}

.ta-print-logo-fallback {
  width: 42mm;
  height: 42mm;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--ta-print-navy);
  color: var(--ta-print-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12pt;
}

.ta-print-side { line-height: 1.5; min-width: 0; }
.ta-print-side--en { direction: ltr; text-align: left; }
.ta-print-side--ar { direction: rtl; text-align: right; }

.ta-print-name-ar {
  color: var(--ta-print-navy);
  font-size: 14pt;
  font-weight: 800;
  margin: 0 0 1mm;
  line-height: 1.25;
}

.ta-print-name-en {
  color: var(--ta-print-navy);
  font-size: 12pt;
  font-weight: 800;
  margin: 0 0 1mm;
  line-height: 1.25;
}

.ta-print-line {
  margin: 0;
  color: var(--ta-print-text);
  font-size: 8.8pt;
}

.ta-print-line--muted { color: var(--ta-print-muted); }

.ta-print-gold-rule {
  height: 0.8mm;
  width: 100%;
  margin-top: 4mm;
  background: linear-gradient(
    to right,
    transparent,
    var(--ta-print-gold) 18%,
    var(--ta-print-gold) 82%,
    transparent
  );
  border-radius: 99px;
}

.ta-print-heading { text-align: center; margin: 5mm 0 4mm; }
.ta-print-heading h1 {
  margin: 0;
  color: var(--ta-print-navy);
  font-size: 17pt;
  line-height: 1.35;
  font-weight: 800;
}
.ta-print-heading__sub {
  margin-top: 1.5mm;
  color: var(--ta-print-muted);
  font-size: 9pt;
}

.ta-print-content {
  flex: 1 1 auto;
  min-height: 0;
  direction: rtl;
}

.ta-print-footer {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: 4mm;
  border-top: 0.35mm solid var(--ta-print-line);
}

.ta-print-signatures {
  direction: ltr;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8mm;
  align-items: end;
}

.ta-print-signature {
  direction: rtl;
  text-align: center;
  min-height: 25mm;
}

.ta-print-signature__title {
  color: var(--ta-print-navy);
  font-size: 8.5pt;
  font-weight: 700;
  margin-bottom: 11mm;
}

.ta-print-signature__line {
  width: 80%;
  margin: 0 auto 2mm;
  border-bottom: 0.35mm solid #7f8792;
}

.ta-print-signature__name {
  font-size: 7.8pt;
  color: var(--ta-print-muted);
}

.ta-print-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4mm;
  margin-top: 5mm;
  color: var(--ta-print-muted);
  font-size: 7pt;
}

.ta-print-footer-row__brand {
  color: var(--ta-print-navy);
  font-weight: 700;
}

.ta-print-avoid-break {
  break-inside: avoid;
  page-break-inside: avoid;
}

.ta-print-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 0.35mm solid var(--ta-print-line);
  border-radius: 2mm;
  overflow: hidden;
  margin-bottom: 4mm;
}

.ta-print-meta__item {
  padding: 2.3mm 3mm;
  border-left: 0.35mm solid var(--ta-print-line);
  font-size: 8.5pt;
}

.ta-print-meta__item:last-child { border-left: 0; }

.ta-print-meta__label {
  display: block;
  color: var(--ta-print-muted);
  font-size: 7.5pt;
  margin-bottom: 0.7mm;
}

.ta-print-meta__value {
  font-weight: 700;
  color: var(--ta-print-navy);
}

.ta-print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  table-layout: fixed;
}

.ta-print-table th {
  background: var(--ta-print-navy);
  color: #fff;
  padding: 2.8mm 2mm;
  font-weight: 700;
  border: 0.25mm solid var(--ta-print-navy);
}

.ta-print-table td {
  border: 0.3mm solid var(--ta-print-line);
  padding: 2.7mm 2mm;
  text-align: center;
  vertical-align: middle;
}

.ta-print-table tr:nth-child(even) td { background: #fafbfc; }
.ta-print-table td.conflict { color: #a34b4b; background: #fdf0f0; font-weight: 700; }
.ta-print-table td.time { font-weight: 700; white-space: nowrap; }

.ta-print-note {
  margin-top: 4mm;
  padding: 3mm 4mm;
  border: 0.3mm solid #e7e0cf;
  background: #fcfaf5;
  border-radius: 2mm;
  font-size: 8.5pt;
}

.ta-print-note strong { color: var(--ta-print-navy); }

@media screen {
  .ta-print-page {
    box-shadow: 0 5px 30px rgba(0, 0, 0, 0.1);
    margin-top: 0;
    margin-bottom: 18px;
  }
}

@media print {
  html, body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm;
  }

  .ta-print-preview-bar,
  .ta-print-no-print {
    display: none !important;
  }

  .ta-print-page {
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
  }
}
`.trim();
