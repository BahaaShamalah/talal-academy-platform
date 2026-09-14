<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: cairo, dejavusans, sans-serif;
            font-size: 9pt;
            color: #17243a;
            direction: rtl;
        }
        @include('pdf.partials.official-styles')
        .grade-doc { margin-bottom: 12px; page-break-inside: avoid; }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            border: 1px solid #d8dde5;
        }
        .meta-table td {
            width: 33.33%;
            padding: 6px 8px;
            border-left: 1px solid #d8dde5;
            font-size: 8.5pt;
            vertical-align: top;
        }
        .meta-table td:last-child { border-left: 0; }
        .meta-label { display: block; color: #5d6879; font-size: 7.5pt; margin-bottom: 2px; }
        .meta-value { font-weight: bold; color: #071d41; }
        .grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .grid th {
            background: #071d41;
            color: #ffffff;
            font-size: 8.5pt;
            font-weight: bold;
            padding: 7px 4px;
            border: 1px solid #071d41;
            text-align: center;
        }
        .grid td {
            padding: 7px 4px;
            border: 1px solid #d8dde5;
            font-size: 8.5pt;
            text-align: center;
            vertical-align: middle;
        }
        .grid td.time-col {
            font-weight: bold;
            color: #071d41;
            white-space: nowrap;
        }
        .grid td.subject { font-weight: bold; color: #071d41; }
        .grid tr:nth-child(even) td { background: #fafbfc; }
        .note-box {
            margin-top: 10px;
            padding: 8px 10px;
            border: 1px solid #e7e0cf;
            background: #fcfaf5;
            font-size: 8.5pt;
        }
        .empty { text-align: center; padding: 18px; color: #5d6879; font-size: 10pt; }
    </style>
</head>
<body>
    @include('pdf.partials.official-header', ['settings' => $settings, 'logoSrc' => $logoSrc])

    <div class="ta-official-doc-title">{{ $title }}</div>
    @if($subtitle || $period_name)
        <div class="ta-official-doc-sub">
            @if($period_name)
                الفترة الدراسية: {{ $period_name }}
            @elseif($subtitle)
                {{ $subtitle }}
            @endif
        </div>
    @endif

    @if(count($grades) === 0)
        <div class="empty">لا توجد حصص مطابقة للفلاتر المحددة.</div>
    @else
        @foreach($grades as $grade)
            <div class="grade-doc">
                <table class="meta-table">
                    <tr>
                        <td>
                            <span class="meta-label">المرحلة</span>
                            <span class="meta-value">{{ $grade['stage_name'] ?: '—' }}</span>
                        </td>
                        <td>
                            <span class="meta-label">الصف</span>
                            <span class="meta-value">{{ $grade['grade_name'] }}</span>
                        </td>
                        <td>
                            <span class="meta-label">الشعبة</span>
                            <span class="meta-value">
                                @if(!empty($grade['grade_section_name']) && $grade['grade_section_name'] !== 'بدون شعبة')
                                    {{ $grade['grade_section_name'] }}
                                @else
                                    —
                                @endif
                            </span>
                        </td>
                    </tr>
                </table>

                @if(count($grade['timeslots']) === 0)
                    <div class="empty">لا توجد حصص مجدولة لهذا الصف.</div>
                @else
                    <table class="grid">
                        <thead>
                            <tr>
                                <th>الوقت</th>
                                @foreach($day_columns as $column)
                                    <th>{{ $column['label'] }}</th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($grade['timeslots'] as $slot)
                                <tr>
                                    <td class="time-col">{{ $slot['time_range'] }}</td>
                                    @foreach($day_columns as $column)
                                        @php($value = $slot['days'][$column['key']] ?? null)
                                        <td @if($value) class="subject" @endif>{{ $value ?? '' }}</td>
                                    @endforeach
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        @endforeach

        <div class="note-box">
            <strong>ملاحظات:</strong>
            <div style="margin-top:4px;">لا توجد ملاحظات في الجدول.</div>
        </div>
    @endif

    @include('pdf.partials.official-signatures', [
        'settings' => $settings,
        'stampSrc' => $stampSrc ?? null,
    ])
</body>
</html>
