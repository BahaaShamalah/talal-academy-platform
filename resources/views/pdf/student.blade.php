<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <title>ملف الطالب — {{ $student->file_number }}</title>
    @if ($forBrowser)
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    @endif
    <style>
        @page { size: A4 portrait; margin: 0; }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: {{ $forBrowser ? '#e9edf2' : '#fff' }};
            color: #17243a;
            font-family: {{ $forBrowser ? '"Cairo", Tahoma, Arial, sans-serif' : 'cairo' }};
            font-size: 10pt;
            direction: rtl;
        }
        @include('pdf.partials.official-styles')

        .toolbar {
            display: {{ $forBrowser ? 'flex' : 'none' }};
            gap: 8px;
            justify-content: center;
            padding: 12px;
        }
        .toolbar button {
            font-family: inherit;
            border: 0;
            background: #071d41;
            border-radius: 10px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 700;
            color: #fff;
            cursor: pointer;
        }

        .sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 12mm 14mm 10mm;
            background: #fff;
            display: flex;
            flex-direction: column;
        }
        @media screen {
            .sheet { box-shadow: 0 5px 30px rgba(0,0,0,.1); margin-bottom: 18px; }
        }

        .body-content { flex: 1 1 auto; min-height: 0; }

        .grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .grid td {
            width: 50%;
            vertical-align: top;
            padding: 7px 10px;
            background: #fafbfc;
            border: 1px solid #d8dde5;
        }
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #071d41;
            margin: 10px 0 6px;
            border-bottom: 1px solid #d8dde5;
            padding-bottom: 3px;
        }
        .label { color: #5d6879; font-size: 8pt; margin-bottom: 2px; text-align: right; }
        .value { font-size: 10pt; font-weight: bold; color: #17243a; text-align: right; }
        .notes {
            padding: 8px 10px;
            background: #fcfaf5;
            border: 1px solid #e7e0cf;
            border-radius: 4px;
            font-size: 9pt;
            line-height: 1.6;
        }
        .meta {
            margin: 8px 0 0;
            font-size: 8pt;
            color: #5d6879;
            text-align: center;
        }

        @media print {
            html, body {
                background: #fff !important;
                width: 210mm;
            }
            .toolbar { display: none !important; }
            .sheet {
                box-shadow: none !important;
                margin: 0 !important;
                width: 210mm;
                min-height: 297mm;
                height: 297mm;
                overflow: hidden;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
@if ($forBrowser)
    <div class="toolbar">
        <button type="button" onclick="window.print()">طباعة A4</button>
    </div>
@endif

<main class="sheet">
    @include('pdf.partials.official-header', ['settings' => $settings, 'logoSrc' => $logoSrc])

    <div class="body-content">
        <div class="ta-official-doc-title">ملف طالب</div>
        <div class="ta-official-doc-sub">
            {{ $student->full_name }}
            · رقم الملف: {{ $student->file_number }}
            · الحالة: {{ $statusLabel }}
        </div>

        <div class="section-title">بيانات الطالب</div>
        <table class="grid">
            <tr>
                <td>
                    <div class="label">الاسم الكامل</div>
                    <div class="value">{{ $student->full_name }}</div>
                </td>
                <td>
                    <div class="label">الجنس</div>
                    <div class="value">{{ $genderLabel }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">المرحلة / الصف</div>
                    <div class="value">{{ $stageLabel }}</div>
                </td>
                <td>
                    <div class="label">المدرسة</div>
                    <div class="value">{{ $student->previous_school ?: '—' }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">تاريخ الميلاد</div>
                    <div class="value">{{ $dobLabel }}</div>
                </td>
                <td>
                    <div class="label">الرقم المدني</div>
                    <div class="value">{{ $student->civil_id ?: '—' }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">هاتف التواصل</div>
                    <div class="value">{{ $student->phone ?: '—' }}</div>
                </td>
                <td>
                    <div class="label">هاتف إضافي</div>
                    <div class="value">{{ $student->phone_secondary ?: '—' }}</div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="label">العنوان</div>
                    <div class="value">{{ $student->address ?: '—' }}</div>
                </td>
            </tr>
        </table>

        <div class="section-title">ولي الأمر</div>
        @if ($guardian)
            <table class="grid">
                <tr>
                    <td>
                        <div class="label">الاسم</div>
                        <div class="value">{{ $guardian->full_name }}</div>
                    </td>
                    <td>
                        <div class="label">صلة القرابة</div>
                        <div class="value">{{ $guardian->relationship?->value ?? $guardian->relationship ?? '—' }}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="label">الهاتف</div>
                        <div class="value">{{ $guardian->phone ?: '—' }}</div>
                    </td>
                    <td>
                        <div class="label">الهاتف الثانوي</div>
                        <div class="value">{{ $guardian->phone_secondary ?: '—' }}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="label">البريد الإلكتروني</div>
                        <div class="value">{{ $guardian->email ?: '—' }}</div>
                    </td>
                    <td>
                        <div class="label">العنوان</div>
                        <div class="value">{{ $guardian->address ?: '—' }}</div>
                    </td>
                </tr>
            </table>
        @else
            <div class="notes">لا يوجد ولي أمر مرتبط.</div>
        @endif

        @if ($student->notes)
            <div class="section-title">ملاحظات</div>
            <div class="notes">{{ $student->notes }}</div>
        @endif

        <div class="meta">تاريخ الطباعة: {{ $printedAt }}</div>
    </div>

    @include('pdf.partials.official-signatures', [
        'settings' => $settings,
        'stampSrc' => $stampSrc,
        'documentLabel' => 'ملف طالب رسمي',
    ])
</main>
</body>
</html>
