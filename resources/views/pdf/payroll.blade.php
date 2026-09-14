<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: cairo, dejavusans, sans-serif;
            font-size: 10pt;
            color: #1c1a17;
            direction: rtl;
        }
        @include('pdf.partials.official-styles')
        .items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .items th {
            background: #071d41; color: #c89a2b; font-size: 8.5pt;
            padding: 8px 5px; border: 1px solid #071d41; text-align: center;
        }
        .items td {
            padding: 7px 5px; border: 1px solid #d8dde5; font-size: 9pt; text-align: center;
        }
        .items td.name { text-align: right; }
        .items tr:nth-child(even) td { background: #fafbfc; }
        .money { direction: ltr; unicode-bidi: embed; }
        .totals { width: 40%; float: left; border-collapse: collapse; }
        .totals td {
            padding: 8px; font-size: 11pt; font-weight: bold; color: #071d41;
            border-top: 2px solid #c89a2b;
        }
        .totals .label { text-align: right; }
        .totals .value { text-align: left; }
        .clear { clear: both; }
    </style>
</head>
<body>
    @include('pdf.partials.official-header', ['settings' => $settings, 'logoSrc' => $logoSrc])

    <div class="ta-official-doc-title">تقرير رواتب المعلمين</div>
    <div class="ta-official-doc-sub">
        الفترة: {{ $periodLabel }}
        &nbsp;|&nbsp;
        الحالة: {{ $statusLabel }}
        &nbsp;|&nbsp;
        عدد البنود: {{ $run->items->count() }}
    </div>

    <table class="items">
        <thead>
            <tr>
                <th>المعلم</th>
                <th>النوع</th>
                <th>الجلسات</th>
                <th>الأساس</th>
                <th>خصومات</th>
                <th>مكافأة</th>
                <th>الصافي</th>
            </tr>
        </thead>
        <tbody>
            @foreach($run->items as $item)
                <tr>
                    <td class="name">{{ $item->teacher?->name ?? '—' }}</td>
                    <td>{{ $typeLabel($item->compensation_type) }}</td>
                    <td>{{ $item->sessions_count ?? '—' }}</td>
                    <td class="money">{{ $formatMoney($item->base_amount) }}</td>
                    <td class="money">{{ $formatMoney($item->deductions) }}</td>
                    <td class="money">{{ $formatMoney($item->bonus) }}</td>
                    <td class="money">{{ $formatMoney($item->net_amount) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td class="label">الإجمالي العام</td>
            <td class="value money">{{ $formatMoney($grandTotal) }} د.ك</td>
        </tr>
    </table>
    <div class="clear"></div>

    @include('pdf.partials.official-signatures', [
        'settings' => $settings,
        'stampSrc' => $stampSrc ?? null,
    ])
</body>
</html>
