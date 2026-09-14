{{--
  Official bilingual header — EN | logo | AR
  Expects: $settings, $logoSrc (nullable)
  Table MUST stay LTR so columns never reverse under dir=rtl body.
--}}
@php
    $settings = $settings ?? null;
    $logoSrc = $logoSrc ?? null;
    $nameAr = trim((string) ($settings?->institute_name_ar ?? ''));
    $nameEn = trim((string) ($settings?->institute_name_en ?? ''));
@endphp
<table class="ta-official-header" dir="ltr" style="direction:ltr;width:100%;">
    <tr>
        <td class="ta-official-side-en" style="width:38%;text-align:left;direction:ltr;vertical-align:middle;">
            @if ($nameEn !== '')
                <div class="ta-official-name-en">{{ $nameEn }}</div>
            @endif
            @if ($settings?->address)
                <p class="ta-official-line">{{ $settings->address }}</p>
            @endif
            @if ($settings?->phone)
                <p class="ta-official-line ta-official-line-muted">Tel: {{ $settings->phone }}</p>
            @endif
            @if ($settings?->email)
                <p class="ta-official-line ta-official-line-muted">Email: {{ $settings->email }}</p>
            @endif
        </td>
        <td class="ta-official-side-logo" style="width:24%;text-align:center;vertical-align:middle;">
            @if ($logoSrc)
                <img src="{{ $logoSrc }}" class="ta-official-logo" alt="" style="width:120px;height:auto;max-height:120px;">
            @else
                <div class="ta-official-logo-fallback" aria-hidden="true">TA</div>
            @endif
        </td>
        <td class="ta-official-side-ar" style="width:38%;text-align:right;direction:rtl;vertical-align:middle;">
            @if ($nameAr !== '')
                <div class="ta-official-name-ar">{{ $nameAr }}</div>
            @endif
            @if ($settings?->address)
                <p class="ta-official-line">{{ $settings->address }}</p>
            @endif
            @if ($settings?->phone)
                <p class="ta-official-line ta-official-line-muted">هاتف: {{ $settings->phone }}</p>
            @endif
            @if ($settings?->email)
                <p class="ta-official-line ta-official-line-muted">البريد: {{ $settings->email }}</p>
            @endif
        </td>
    </tr>
</table>
<div class="ta-official-gold-rule"></div>
