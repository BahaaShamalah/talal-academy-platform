<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: cairo, dejavusans, sans-serif;
            font-size: 9.5pt;
            color: #1c1a17;
            direction: rtl;
        }
        @include('pdf.partials.official-styles')
        .day-block { margin-bottom: 12px; page-break-inside: avoid; }
        .day-title {
            background: #071d41;
            color: #c89a2b;
            font-weight: bold;
            font-size: 10pt;
            padding: 6px 10px;
            margin-bottom: 0;
        }
        .sessions { width: 100%; border-collapse: collapse; }
        .sessions th {
            background: #f3f4f6;
            color: #071d41;
            font-size: 8.5pt;
            padding: 6px 5px;
            border: 1px solid #d8dde5;
            text-align: center;
        }
        .sessions td {
            padding: 7px 5px;
            border: 1px solid #d8dde5;
            font-size: 9pt;
            text-align: center;
            vertical-align: middle;
        }
        .sessions td.subject { text-align: right; font-weight: bold; color: #071d41; }
        .sessions tr:nth-child(even) td { background: #fafbfc; }
        .cancelled { color: #a34b4b; text-decoration: line-through; }
        .empty { text-align: center; padding: 18px; color: #6b7280; }
        .time { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
    </style>
</head>
<body>
    @include('pdf.partials.official-header', ['settings' => $settings, 'logoSrc' => $logoSrc])

    <div class="ta-official-doc-title">{{ $title }}</div>
    <div class="ta-official-doc-sub">{{ $subtitle }}</div>
    @if(!empty($teacherName))
        <div class="ta-official-doc-sub" style="margin-top:-6px;">المعلم: {{ $teacherName }}</div>
    @endif

    @if(count($days) === 0)
        <div class="empty">لا توجد حصص في هذه الفترة.</div>
    @else
        @foreach($days as $day)
            <div class="day-block">
                <div class="day-title">{{ $day['label'] }}</div>
                <table class="sessions">
                    <thead>
                        <tr>
                            <th style="width:22%;">الوقت</th>
                            <th style="width:34%;">المادة</th>
                            <th style="width:22%;">القاعة</th>
                            <th style="width:22%;">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($day['sessions'] as $session)
                            <tr class="{{ ($session['status'] ?? '') === 'cancelled' ? 'cancelled' : '' }}">
                                <td class="time">{{ $session['time_range'] }}</td>
                                <td class="subject">{{ $session['subject_name'] }}</td>
                                <td>{{ $session['hall_name'] }}</td>
                                <td>{{ $session['status_label'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach
    @endif

    @include('pdf.partials.official-signatures', [
        'settings' => $settings,
        'stampSrc' => $stampSrc ?? null,
        'approvedBy' => $teacherName ?: ($settings->director_name ?: 'الاسم والتوقيع'),
    ])
</body>
</html>
