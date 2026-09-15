'use client';

import { Icon } from '@/components/ui/icon';

export function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
      <div className="flex items-center gap-2 border-b border-[#f0ece1] bg-[#faf8f3] px-5 py-3.5">
        <Icon name={icon} className="text-[14px] text-gold-deep" />
        <h2 className="text-[14.5px] font-extrabold text-ink">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function SeoSharePreview({
  title,
  description,
  imageUrl,
  siteLabel,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  siteLabel: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-[14px] border border-[#d8dee6] bg-[#e8edf2] p-3">
      <p className="mb-2 text-[11.5px] font-semibold text-[#5d6879]">معاينة رابط واتساب / مشاركة</p>
      <div className="overflow-hidden rounded-[12px] border border-[#cfd6df] bg-white shadow-sm">
        <div className="aspect-[1200/630] max-h-[160px] w-full bg-[#edf1f5]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-[#8a93a0]">
              بدون صورة معاينة
            </div>
          )}
        </div>
        <div className="space-y-0.5 px-3 py-2.5" dir="rtl">
          <div className="truncate text-[11px] uppercase tracking-wide text-[#7a8491]">
            {siteLabel || 'talalacademy.com'}
          </div>
          <div className="line-clamp-2 text-[13.5px] font-bold leading-snug text-[#111b27]">
            {title || 'عنوان الموقع'}
          </div>
          <div className="line-clamp-2 text-[12px] leading-relaxed text-[#5d6879]">
            {description || 'وصف الموقع يظهر هنا…'}
          </div>
        </div>
      </div>
    </div>
  );
}
