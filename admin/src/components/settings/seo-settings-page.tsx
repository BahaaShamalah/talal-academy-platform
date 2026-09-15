'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
import { SeoSharePreview, SettingsSection } from '@/components/settings/settings-shared';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { apiClient, type InstituteSetting } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type SeoFormState = {
  seo_title: string;
  seo_description: string;
  google_analytics_id: string;
  google_search_console_verification: string;
  institute_name_ar: string;
};

export function SeoSettingsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('settings.manage'));
  const qc = useQueryClient();

  const [form, setForm] = useState<SeoFormState | null>(null);
  const [faviconId, setFaviconId] = useState<number | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [ogImageId, setOgImageId] = useState<number | null>(null);
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [removeOgImage, setRemoveOgImage] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: async () => {
      const data = await apiClient<InstituteSetting>('/settings/institute');
      setForm({
        seo_title: data.seo_title ?? '',
        seo_description: data.seo_description ?? '',
        google_analytics_id: data.google_analytics_id ?? '',
        google_search_console_verification: data.google_search_console_verification ?? '',
        institute_name_ar: data.institute_name_ar ?? '',
      });
      setFaviconId(data.favicon_media_id ?? null);
      setFaviconUrl(data.favicon_url ?? null);
      setOgImageId(data.og_image_media_id ?? null);
      setOgImageUrl(data.og_image_url ?? null);
      setRemoveFavicon(false);
      setRemoveOgImage(false);
      return data;
    },
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;

      const payload: Record<string, unknown> = {
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        google_analytics_id: form.google_analytics_id.trim() || null,
        google_search_console_verification: form.google_search_console_verification.trim() || null,
      };
      if (removeFavicon) payload.remove_favicon = true;
      else if (faviconId) payload.favicon_media_id = faviconId;
      if (removeOgImage) payload.remove_og_image = true;
      else if (ogImageId) payload.og_image_media_id = ogImageId;

      return apiClient<InstituteSetting>('/settings/institute', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      toast.success('تم حفظ إعدادات السيو');
      setRemoveFavicon(false);
      setRemoveOgImage(false);
      if (data) {
        setFaviconId(data.favicon_media_id ?? null);
        setFaviconUrl(data.favicon_url ?? null);
        setOgImageId(data.og_image_media_id ?? null);
        setOgImageUrl(data.og_image_url ?? null);
        setForm({
          seo_title: data.seo_title ?? '',
          seo_description: data.seo_description ?? '',
          google_analytics_id: data.google_analytics_id ?? '',
          google_search_console_verification: data.google_search_console_verification ?? '',
          institute_name_ar: data.institute_name_ar ?? '',
        });
        qc.setQueryData(['institute-settings'], data);
      }
      qc.invalidateQueries({ queryKey: ['institute-settings'] });
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <>
        <AdminHeader title="إعدادات السيو" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  const previewTitle =
    form?.seo_title.trim() || form?.institute_name_ar.trim() || 'طلال أكاديمي';
  const previewDescription =
    form?.seo_description.trim() ||
    'برامج تعليمية حضورية ومتابعة مستمرة لطلاب المراحل في الكويت.';

  return (
    <>
      <AdminHeader title="إعدادات السيو" crumb="النظام ← السيو والتكاملات" />

      <AdminContent className="flex flex-col gap-4">
        {settingsQuery.isLoading || !form ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">
            جاري التحميل…
          </div>
        ) : (
          <>
            <SettingsSection title="إعدادات السيو" icon="fa-solid fa-magnifying-glass-chart">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>عنوان الموقع الافتراضي</label>
                  <input
                    className={formFieldClass}
                    maxLength={255}
                    placeholder="طلال أكاديمي | تعليم حضوري في الكويت"
                    value={form.seo_title}
                    onChange={(e) => setForm((f) => (f ? { ...f, seo_title: e.target.value } : f))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>وصف الموقع</label>
                  <textarea
                    className={`${formFieldClass} min-h-[96px]`}
                    maxLength={500}
                    placeholder="وصف قصير يظهر في نتائج البحث ومعاينة الروابط…"
                    value={form.seo_description}
                    onChange={(e) => setForm((f) => (f ? { ...f, seo_description: e.target.value } : f))}
                  />
                  <p className="mt-1.5 text-[11.5px] text-ink-dim">
                    الطول المثالي لمحركات البحث حوالي 160 حرفًا ({form.seo_description.length}/160)
                  </p>
                </div>
                <div>
                  <MediaPicker
                    label="Favicon"
                    valueId={removeFavicon ? null : faviconId}
                    valueUrl={removeFavicon ? null : faviconUrl}
                    forceFormat="png"
                    onChange={(m) => {
                      setFaviconId(m.id);
                      setFaviconUrl(m.url);
                      setRemoveFavicon(false);
                    }}
                    onClear={() => {
                      setFaviconId(null);
                      setFaviconUrl(null);
                      setRemoveFavicon(true);
                    }}
                  />
                  <p className="mt-1.5 text-[11.5px] text-ink-dim">الحجم المثالي: مربع 512×512</p>
                </div>
                <div>
                  <MediaPicker
                    label="صورة معاينة المشاركة (Open Graph)"
                    valueId={removeOgImage ? null : ogImageId}
                    valueUrl={removeOgImage ? null : ogImageUrl}
                    forceFormat="jpeg"
                    onChange={(m) => {
                      setOgImageId(m.id);
                      setOgImageUrl(m.url);
                      setRemoveOgImage(false);
                    }}
                    onClear={() => {
                      setOgImageId(null);
                      setOgImageUrl(null);
                      setRemoveOgImage(true);
                    }}
                  />
                  <p className="mt-1.5 text-[11.5px] text-ink-dim">
                    الحجم المثالي: 1200×630 لعرض أفضل في واتساب وفيسبوك
                  </p>
                </div>
              </div>

              <SeoSharePreview
                title={previewTitle}
                description={previewDescription}
                imageUrl={removeOgImage ? null : ogImageUrl}
                siteLabel="talalacademy.com"
              />
            </SettingsSection>

            <SettingsSection title="التكاملات" icon="fa-brands fa-google">
              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className={formLabelClass + ' !mb-0'}>معرّف Google Analytics</label>
                    <a
                      href="https://analytics.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] font-semibold text-gold-deep hover:underline"
                    >
                      كيف أحصل عليه؟
                    </a>
                  </div>
                  <input
                    className={formFieldClass}
                    dir="ltr"
                    maxLength={50}
                    placeholder="G-XXXXXXXXXX"
                    value={form.google_analytics_id}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, google_analytics_id: e.target.value } : f))
                    }
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className={formLabelClass + ' !mb-0'}>كود تحقق Search Console</label>
                    <a
                      href="https://search.google.com/search-console"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] font-semibold text-gold-deep hover:underline"
                    >
                      كيف أحصل عليه؟
                    </a>
                  </div>
                  <input
                    className={formFieldClass}
                    dir="ltr"
                    maxLength={512}
                    placeholder="نص طويل تعطيه Google"
                    value={form.google_search_console_verification}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, google_search_console_verification: e.target.value } : f,
                      )
                    }
                  />
                </div>
              </div>
              <p className="mt-3 text-[11.5px] text-ink-dim">
                اترك الحقول فاضية لو ما عندك حسابات Google جاهزة بعد — الموقع يشتغل عادي بدونها
              </p>
            </SettingsSection>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
              >
                {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ إعدادات السيو'}
              </button>
            </div>
          </>
        )}
      </AdminContent>
    </>
  );
}
