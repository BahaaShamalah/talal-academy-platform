{{--
  Official signature row — إعداد / اعتماد / ختم
  Expects: $settings, optional $stampSrc, $preparedBy, $approvedBy, $showSignatures (default true)
--}}
@php
    $showSignatures = $showSignatures ?? true;
    $preparedBy = $preparedBy ?? 'الاسم والتوقيع';
    $approvedBy = $approvedBy ?? ($settings->director_name ?: 'الاسم والتوقيع');
    $stampSrc = $stampSrc ?? null;
    $documentLabel = $documentLabel ?? 'وثيقة رسمية — للاستخدام الداخلي';
    $nameAr = trim((string) ($settings->institute_name_ar ?? ''));
    $nameEn = trim((string) ($settings->institute_name_en ?? ''));
@endphp
@if ($showSignatures)
<div class="ta-official-footer-wrap">
    <table class="ta-official-sig-table">
        <tr>
            <td>
                <div class="ta-official-sig-title">إعداد</div>
                <div class="ta-official-sig-line"></div>
                <div class="ta-official-sig-name">{{ $preparedBy }}</div>
            </td>
            <td>
                <div class="ta-official-sig-title">اعتماد</div>
                <div class="ta-official-sig-line"></div>
                <div class="ta-official-sig-name">{{ $approvedBy }}</div>
            </td>
            <td>
                <div class="ta-official-sig-title">ختم المعهد</div>
                @if ($stampSrc)
                    <img src="{{ $stampSrc }}" class="ta-official-stamp" alt="">
                @endif
                <div class="ta-official-sig-line"></div>
                <div class="ta-official-sig-name">الختم الرسمي</div>
            </td>
        </tr>
    </table>
    <div class="ta-official-footer-row">
        <span class="brand">{{ $nameAr !== '' ? $nameAr : '—' }}</span>
        <span class="label">{{ $documentLabel }}</span>
        <span class="en">{{ $nameEn !== '' ? $nameEn : '—' }}</span>
    </div>
</div>
@endif
