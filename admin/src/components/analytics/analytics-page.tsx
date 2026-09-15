'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  qs,
  type AnalyticsCountryRow,
  type AnalyticsDeviceRow,
  type AnalyticsOverview,
  type AnalyticsTimeseriesPoint,
  type AnalyticsTopPage,
  type AnalyticsTopReferrer,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type RangePreset = 'today' | '7d' | '30d' | 'custom';

const th = 'px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim';
const DEVICE_META: Record<string, { label: string; icon: string; color: string }> = {
  desktop: { label: 'كمبيوتر', icon: 'fa-solid fa-desktop', color: '#1c4b8f' },
  mobile: { label: 'جوال', icon: 'fa-solid fa-mobile-screen', color: '#c8a24a' },
  tablet: { label: 'تابلت', icon: 'fa-solid fa-tablet-screen-button', color: '#2e7d4f' },
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function rangeForPreset(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const to = startOfDay(new Date());
  if (preset === 'today') {
    return { from: ymd(to), to: ymd(to) };
  }
  const from = new Date(to);
  from.setDate(from.getDate() - (preset === '7d' ? 6 : 29));
  return { from: ymd(from), to: ymd(to) };
}

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🌐';
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

function countryName(code: string | null | undefined): string {
  if (!code) return 'غير معروف';
  try {
    return new Intl.DisplayNames(['ar'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function formatPeriodLabel(period: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [, m, d] = period.split('-');
    return `${Number(d)}/${Number(m)}`;
  }
  return period;
}

export function AnalyticsPage() {
  const canView = useAuthStore((s) => s.hasPermission('analytics.view'));
  const initial = rangeForPreset('30d');
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const applyPreset = (next: Exclude<RangePreset, 'custom'>) => {
    const range = rangeForPreset(next);
    setPreset(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const params = useMemo(() => ({ from, to }), [from, to]);

  const overviewQuery = useQuery({
    queryKey: ['analytics-overview', params],
    queryFn: () => apiClient<AnalyticsOverview>(`/analytics/overview${qs(params)}`),
    enabled: canView,
  });

  const timeseriesQuery = useQuery({
    queryKey: ['analytics-timeseries', params],
    queryFn: () =>
      apiClient<{ data: AnalyticsTimeseriesPoint[] }>(
        `/analytics/timeseries${qs({ ...params, group_by: 'day' })}`,
      ),
    enabled: canView,
  });

  const topPagesQuery = useQuery({
    queryKey: ['analytics-top-pages', params],
    queryFn: () =>
      apiClient<{ data: AnalyticsTopPage[] }>(`/analytics/top-pages${qs({ ...params, limit: 10 })}`),
    enabled: canView,
  });

  const topReferrersQuery = useQuery({
    queryKey: ['analytics-top-referrers', params],
    queryFn: () =>
      apiClient<{ data: AnalyticsTopReferrer[] }>(
        `/analytics/top-referrers${qs({ ...params, limit: 10 })}`,
      ),
    enabled: canView,
  });

  const byCountryQuery = useQuery({
    queryKey: ['analytics-by-country', params],
    queryFn: () =>
      apiClient<{ data: AnalyticsCountryRow[] }>(`/analytics/by-country${qs(params)}`),
    enabled: canView,
  });

  const byDeviceQuery = useQuery({
    queryKey: ['analytics-by-device', params],
    queryFn: () =>
      apiClient<{ data: AnalyticsDeviceRow[] }>(`/analytics/by-device${qs(params)}`),
    enabled: canView,
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="تحليلات الزوار" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const overview = overviewQuery.data;
  const series = timeseriesQuery.data?.data ?? [];
  const pages = topPagesQuery.data?.data ?? [];
  const referrers = topReferrersQuery.data?.data ?? [];
  const countries = byCountryQuery.data?.data ?? [];
  const devices = byDeviceQuery.data?.data ?? [];

  const seriesMax = Math.max(...series.map((r) => r.visits), 1);
  const pagesMax = Math.max(...pages.map((r) => r.visits), 1);
  const topPage = pages[0];
  const countriesTotal = countries.reduce((s, r) => s + r.visits, 0) || 1;
  const devicesTotal = devices.reduce((s, r) => s + r.visits, 0) || 1;

  const deviceCards = (['desktop', 'mobile', 'tablet'] as const).map((key) => {
    const row = devices.find((d) => d.device_type === key);
    const visits = row?.visits ?? 0;
    const meta = DEVICE_META[key];
    return {
      key,
      ...meta,
      visits,
      pct: devicesTotal > 0 ? Math.round((visits / devicesTotal) * 100) : 0,
    };
  });

  const presetBtn = (id: RangePreset, label: string, onClick: () => void) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
        preset === id
          ? 'bg-navy-800 text-white'
          : 'border border-cream-line bg-white text-navy hover:bg-cream-soft'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <AdminHeader title="تحليلات الزوار" crumb="زيارات الموقع التسويقي" />

      <AdminContent className="flex flex-col gap-4">
        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy-800">الفترة</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-faint">
                من {from} إلى {to} — تُحدَّث كل الأقسام تلقائيًا
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {presetBtn('today', 'اليوم', () => applyPreset('today'))}
              {presetBtn('7d', 'آخر 7 أيام', () => applyPreset('7d'))}
              {presetBtn('30d', 'آخر 30 يوم', () => applyPreset('30d'))}
              {presetBtn('custom', 'نطاق مخصص', () => setPreset('custom'))}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px]"
                  value={from}
                  onChange={(e) => {
                    setPreset('custom');
                    setFrom(e.target.value);
                  }}
                />
                <span className="text-[12px] text-ink-dim">إلى</span>
                <input
                  type="date"
                  className="rounded-[10px] border border-cream-line bg-cream-soft px-2.5 py-1.5 text-[12px]"
                  value={to}
                  onChange={(e) => {
                    setPreset('custom');
                    setTo(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {[
            {
              icon: 'fa-solid fa-eye',
              value: overviewQuery.isLoading ? '…' : String(overview?.total_visits ?? 0),
              label: 'إجمالي الزيارات',
              note: 'بدون بوتات',
            },
            {
              icon: 'fa-solid fa-user-group',
              value: overviewQuery.isLoading ? '…' : String(overview?.unique_visitors ?? 0),
              label: 'الزوار الفريدون',
              note: 'تقريبي عبر ip_hash',
            },
            {
              icon: 'fa-solid fa-chart-simple',
              value: overviewQuery.isLoading
                ? '…'
                : String(overview?.avg_daily_visits ?? 0),
              label: 'متوسط الزيارات اليومي',
              note: 'على طول الفترة',
            },
            {
              icon: 'fa-solid fa-file-lines',
              value: topPagesQuery.isLoading
                ? '…'
                : topPage
                  ? String(topPage.visits)
                  : '0',
              label: topPage ? `أكثر صفحة: ${topPage.path}` : 'أكثر صفحة زيارة',
              note: topPage ? 'خلال الفترة المحددة' : 'لا بيانات بعد',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[18px] border border-cream-line bg-white p-4 shadow-[0_10px_24px_-20px_rgba(6,26,58,.5)]"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
                <Icon name={s.icon} />
              </span>
              <div className="font-latin mt-3 text-[28px] font-bold leading-none text-navy-800">
                {s.value}
              </div>
              <div className="mt-1.5 truncate text-[13px] text-ink-soft" title={s.label}>
                {s.label}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-faint">{s.note}</div>
            </div>
          ))}
        </div>

        <section className="rounded-[18px] border border-cream-line bg-white p-4">
          <h2 className="mb-1 text-[15px] font-bold text-navy-800">الزيارات عبر الوقت</h2>
          <p className="mb-4 text-[11.5px] text-ink-faint">تجميع يومي لنفس أسلوب التقارير المالية</p>
          {timeseriesQuery.isLoading ? (
            <div className="flex h-[180px] items-center justify-center text-[13px] text-ink-dim">
              جاري التحميل…
            </div>
          ) : series.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-chart-column"
              title="لا زيارات في الفترة"
              body="جرّب توسيع النطاق أو تأكد من عمل تتبّع الموقع التسويقي."
            />
          ) : (
            <div className="relative flex h-[180px] items-end gap-1.5 overflow-x-auto border-b border-[#f0ece1] pb-6">
              {series.map((row, i) => (
                <div
                  key={row.period}
                  className="relative flex h-full min-w-[28px] flex-1 flex-col items-center justify-end gap-1"
                  title={`${row.period}: ${row.visits} زيارة`}
                >
                  <span className="font-latin text-[10px] text-ink-dim">{row.visits}</span>
                  <div
                    className="w-full max-w-[42px] rounded-t-[8px] rounded-b-[3px]"
                    style={{
                      height: `${Math.max(8, Math.round((row.visits / seriesMax) * 100))}%`,
                      background:
                        i === series.length - 1
                          ? 'linear-gradient(180deg,#e2c67f,#c8a24a)'
                          : 'linear-gradient(180deg,#c5cddd,#9fadc6)',
                    }}
                  />
                  <span className="absolute -bottom-5 max-w-full truncate text-[10px] text-ink-faint">
                    {formatPeriodLabel(row.period)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="border-b border-[#f0ece1] px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-navy-800">أكثر الصفحات زيارة</h2>
            </div>
            {topPagesQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} cols={2} />
              </div>
            ) : pages.length === 0 ? (
              <div className="p-4">
                <EmptyState icon="fa-solid fa-file" title="لا صفحات" body="لا زيارات مسجّلة." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-cream-soft">
                      <th className={th}>المسار</th>
                      <th className={th}>الزيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((row) => {
                      const pct = Math.round((row.visits / pagesMax) * 100);
                      return (
                        <tr key={row.path} className="border-t border-[#f4f1ea]">
                          <td className="font-latin px-4 py-3 font-semibold text-ink" dir="ltr">
                            {row.path}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-latin w-8 text-left font-bold text-navy">
                                {row.visits}
                              </span>
                              <div className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-cream-soft">
                                <div
                                  className="h-full rounded-full bg-gradient-to-l from-gold-soft to-gold"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="border-b border-[#f0ece1] px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-navy-800">أكثر مصادر الزيارة</h2>
            </div>
            {topReferrersQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} cols={2} />
              </div>
            ) : referrers.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon="fa-solid fa-link"
                  title="لا مصادر"
                  body="الزيارات المباشرة أو بلا referrer لا تظهر هنا."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-cream-soft">
                      <th className={th}>المصدر</th>
                      <th className={th}>الزيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map((row) => (
                      <tr key={row.referrer || 'direct'} className="border-t border-[#f4f1ea]">
                        <td className="px-4 py-3 font-semibold text-ink" dir="ltr">
                          {row.referrer?.trim() ? row.referrer : 'مباشر'}
                        </td>
                        <td className="font-latin px-4 py-3 font-bold text-navy">{row.visits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="border-b border-[#f0ece1] px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-navy-800">الدول</h2>
            </div>
            {byCountryQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={4} cols={3} />
              </div>
            ) : countries.length === 0 ? (
              <div className="p-4">
                <EmptyState icon="fa-solid fa-globe" title="لا بيانات دول" body="قد يكون GeoIP غير مفعّل محليًا." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-cream-soft">
                      <th className={th}>الدولة</th>
                      <th className={th}>الزيارات</th>
                      <th className={th}>النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((row) => {
                      const pct = Math.round((row.visits / countriesTotal) * 100);
                      return (
                        <tr
                          key={row.country_code ?? 'unknown'}
                          className="border-t border-[#f4f1ea]"
                        >
                          <td className="px-4 py-3 font-semibold text-ink">
                            <span className="me-2 text-[16px]">{countryFlag(row.country_code)}</span>
                            {countryName(row.country_code)}
                          </td>
                          <td className="font-latin px-4 py-3 font-bold text-navy">{row.visits}</td>
                          <td className="font-latin px-4 py-3 text-ink-dim">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-cream-line bg-white p-4">
            <h2 className="mb-4 text-[15px] font-bold text-navy-800">الأجهزة</h2>
            {byDeviceQuery.isLoading ? (
              <div className="flex h-[140px] items-center justify-center text-[13px] text-ink-dim">
                جاري التحميل…
              </div>
            ) : devices.every((d) => d.visits === 0) && devices.length === 0 ? (
              <EmptyState icon="fa-solid fa-mobile" title="لا بيانات أجهزة" body="لا زيارات في الفترة." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {deviceCards.map((d) => (
                  <div
                    key={d.key}
                    className="flex flex-col items-center rounded-[14px] border border-[#f0ece1] bg-cream-soft px-3 py-4 text-center"
                  >
                    <DeviceDonut pct={d.pct} color={d.color} />
                    <span className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-navy">
                      <Icon name={d.icon} className="text-[12px] text-gold-deep" />
                      {d.label}
                    </span>
                    <span className="font-latin mt-1 text-[18px] font-bold text-navy-800">
                      {d.pct}%
                    </span>
                    <span className="mt-0.5 text-[11px] text-ink-faint">{d.visits} زيارة</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </AdminContent>
    </>
  );
}

function DeviceDonut({ pct, color }: { pct: number; color: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#efe9dc" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}
