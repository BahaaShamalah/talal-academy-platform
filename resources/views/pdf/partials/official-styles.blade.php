{{-- Shared official letterhead — aligned with A4 print reference. --}}
.ta-official-header {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2px;
    direction: ltr !important;
}
.ta-official-header td { vertical-align: middle; padding: 0 4px; }
.ta-official-side-en { width: 38%; text-align: left; direction: ltr; }
.ta-official-side-ar { width: 38%; text-align: right; direction: rtl; }
.ta-official-side-logo { width: 24%; text-align: center; }
.ta-official-logo { width: 120px; height: auto; max-height: 120px; }
.ta-official-logo-fallback {
    width: 110px;
    height: 110px;
    margin: 0 auto;
    border-radius: 50%;
    background: #071d41;
    color: #c89a2b;
    font-weight: bold;
    font-size: 20px;
    line-height: 110px;
    text-align: center;
}
.ta-official-name-ar { font-size: 13pt; font-weight: bold; color: #071d41; margin: 0 0 2px 0; }
.ta-official-name-en { font-size: 11pt; font-weight: bold; color: #071d41; margin: 0 0 2px 0; }
.ta-official-line { font-size: 8.5pt; color: #17243a; margin: 0; line-height: 1.45; }
.ta-official-line-muted { color: #5d6879; }
.ta-official-gold-rule {
    height: 2.5px;
    width: 100%;
    background: #c89a2b;
    margin: 10px 0 12px;
}
.ta-official-doc-title {
    text-align: center;
    margin: 6px 0 4px;
    font-size: 16pt;
    font-weight: bold;
    color: #071d41;
}
.ta-official-doc-sub {
    text-align: center;
    font-size: 9pt;
    color: #5d6879;
    margin-bottom: 12px;
}
.ta-official-sig-table {
    width: 100%;
    margin-top: 0;
    border-collapse: collapse;
    page-break-inside: avoid;
}
.ta-official-sig-table td {
    width: 33%;
    text-align: center;
    vertical-align: bottom;
    padding: 0 8px;
}
.ta-official-sig-title {
    color: #071d41;
    font-size: 8.5pt;
    font-weight: bold;
    margin-bottom: 22px;
}
.ta-official-sig-line {
    border-bottom: 1px solid #7f8792;
    width: 80%;
    margin: 0 auto 4px;
}
.ta-official-sig-name { font-size: 7.8pt; color: #5d6879; }
.ta-official-stamp { width: 48px; height: auto; margin-bottom: 4px; }
.ta-official-footer-wrap {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid #d8dde5;
}
.ta-official-footer-row {
    display: table;
    width: 100%;
    margin-top: 10px;
    font-size: 7.5pt;
    color: #5d6879;
}
.ta-official-footer-row span { display: table-cell; width: 33.33%; }
.ta-official-footer-row .brand { color: #071d41; font-weight: bold; text-align: right; }
.ta-official-footer-row .label { text-align: center; }
.ta-official-footer-row .en { text-align: left; direction: ltr; }
