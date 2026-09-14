<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    @if (!empty($forBrowser))
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <style>
            @page { size: A4 portrait; margin: 0; }
            @media screen {
                body { background: #e9edf2; padding: 18px 12px; }
                .sheet {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 12mm 14mm 10mm;
                    background: #fff;
                    box-shadow: 0 5px 30px rgba(0,0,0,.1);
                }
            }
            @media print {
                body { background: #fff !important; padding: 0 !important; }
                .toolbar { display: none !important; }
                .sheet { box-shadow: none !important; margin: 0 !important; width: 210mm; padding: 12mm 14mm 10mm; }
            }
            .toolbar { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; }
            .toolbar button {
                font-family: inherit; border: 0; background: #071d41; color: #fff;
                border-radius: 10px; padding: 8px 16px; font-weight: 700; cursor: pointer;
            }
        </style>
    @endif
    <style>
        body {
            font-family: {{ !empty($forBrowser) ? '"Cairo", system-ui, sans-serif' : 'cairo' }};
            font-size: 10pt;
            color: #1c1a17;
            direction: rtl;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        @include('pdf.partials.official-styles')
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .meta-table td { width: 50%; vertical-align: top; padding: 10px 12px; background: #fafbfc; border: 1px solid #d8dde5; }
        .meta-title {
            font-size: 9pt; font-weight: bold; color: #071d41;
            margin-bottom: 8px; border-bottom: 1px solid #d8dde5; padding-bottom: 4px;
        }
        .invoice-number { font-size: 13pt; font-weight: bold; color: #071d41; letter-spacing: 0.5px; }
        .badge {
            display: inline-block; padding: 3px 10px; border-radius: 12px;
            color: #fff; font-size: 8.5pt; font-weight: bold;
        }
        .row-label { color: #4f5766; font-size: 8.5pt; }
        .row-value { font-size: 10pt; margin-bottom: 4px; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .items th {
            background: #071d41; color: #c89a2b; font-size: 9pt;
            padding: 8px 6px; border: 1px solid #071d41; text-align: center;
        }
        .items td {
            padding: 8px 6px; border: 1px solid #d8dde5; font-size: 9.5pt; text-align: center;
        }
        .items td.desc { text-align: right; }
        .items tr:nth-child(even) td { background: #fafbfc; }
        .totals-wrap { width: 100%; margin-top: 4px; }
        .totals { width: 45%; float: left; border-collapse: collapse; }
        .totals td { padding: 6px 8px; font-size: 9.5pt; border-bottom: 1px solid #eee; }
        .totals .label { color: #4f5766; text-align: right; }
        .totals .value { text-align: left; direction: ltr; unicode-bidi: embed; }
        .totals .grand td {
            font-size: 12pt; font-weight: bold; color: #071d41;
            border-top: 2px solid #c89a2b; border-bottom: none; padding-top: 10px;
        }
        .payment-box {
            clear: both; margin-top: 18px; padding: 10px 12px;
            background: #e9f3ec; border: 1px solid #c9e2d2; color: #2e7d4f; font-size: 9.5pt;
        }
        .money { direction: ltr; unicode-bidi: embed; }
        .clear { clear: both; }
    </style>
</head>
<body>
@if (!empty($forBrowser))
    <div class="toolbar">
        <button type="button" onclick="window.print()">طباعة</button>
    </div>
@endif

<div class="{{ !empty($forBrowser) ? 'sheet' : '' }}">
    @include('pdf.partials.official-header', ['settings' => $settings, 'logoSrc' => $logoSrc])

    <div class="ta-official-doc-title">فاتورة</div>
    <div class="ta-official-doc-sub">{{ $invoice->invoice_number }}</div>

    <table class="meta-table">
        <tr>
            <td>
                <div class="meta-title">بيانات الفاتورة</div>
                <div class="row-label">رقم الفاتورة</div>
                <div class="invoice-number money">{{ $invoice->invoice_number }}</div>
                <div class="row-label" style="margin-top:8px;">تاريخ الإصدار</div>
                <div class="row-value">{{ $issuedAt }}</div>
                <div class="row-label">الحالة</div>
                <div class="row-value">
                    <span class="badge" style="background: {{ $statusColor }};">{{ $statusLabel }}</span>
                </div>
            </td>
            <td>
                <div class="meta-title">بيانات الطالب</div>
                <div class="row-label">الاسم</div>
                <div class="row-value">{{ $invoice->student?->full_name ?? '—' }}</div>
                <div class="row-label">رقم الملف</div>
                <div class="row-value money">{{ $invoice->student?->file_number ?? '—' }}</div>
                @if ($invoice->student?->guardian)
                    <div class="row-label">ولي الأمر</div>
                    <div class="row-value">{{ $invoice->student->guardian->full_name }}</div>
                    <div class="row-label">هاتف ولي الأمر</div>
                    <div class="row-value money">{{ $invoice->student->guardian->phone }}</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 8%;">#</th>
                <th style="width: 46%;">الوصف</th>
                <th style="width: 16%;">سعر الوحدة</th>
                <th style="width: 12%;">الكمية</th>
                <th style="width: 18%;">الإجمالي</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $index => $item)
                <tr>
                    <td class="money">{{ $index + 1 }}</td>
                    <td class="desc">{{ $item->description }}</td>
                    <td class="money">{{ $formatMoney($item->unit_price) }}</td>
                    <td class="money">{{ $item->quantity }}</td>
                    <td class="money">{{ $formatMoney($item->line_total) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals-wrap">
        <table class="totals">
            <tr>
                <td class="label">المجموع الفرعي</td>
                <td class="value">{{ $formatMoney($invoice->subtotal) }} د.ك</td>
            </tr>
            @if ($showCouponDiscount)
                <tr>
                    <td class="label">خصم الكوبون</td>
                    <td class="value">{{ $formatMoney($invoice->coupon_discount_amount) }} د.ك</td>
                </tr>
            @endif
            @if ($showFamilyDiscount)
                <tr>
                    <td class="label">خصم عائلي ({{ number_format((float) $invoice->family_discount_percentage, 0) }}%)</td>
                    <td class="value">{{ $formatMoney($invoice->family_discount_amount) }} د.ك</td>
                </tr>
            @endif
            @if ($showCreditApplied)
                <tr>
                    <td class="label">رصيد مستخدم</td>
                    <td class="value">{{ $formatMoney($invoice->credit_applied_amount) }} د.ك</td>
                </tr>
            @endif
            <tr class="grand">
                <td class="label">الإجمالي النهائي</td>
                <td class="value">{{ $formatMoney($invoice->total) }} د.ك</td>
            </tr>
        </table>
    </div>

    @if ($invoice->status?->value === 'paid' && $paidAt && $paymentLabel)
        <div class="payment-box">
            تم الدفع بتاريخ {{ $paidAt }} عبر {{ $paymentLabel }}
        </div>
    @endif

    <div class="clear"></div>

    @include('pdf.partials.official-signatures', [
        'settings' => $settings,
        'stampSrc' => $stampSrc,
    ])
</div>
</body>
</html>
