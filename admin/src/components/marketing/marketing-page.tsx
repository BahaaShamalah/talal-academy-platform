'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminContent } from '@/components/layout/admin-content';
import { adminContentClass } from '@/lib/layout';
import { Icon } from '@/components/ui/icon';
import { apiClient, type MarketingSection } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  CardList,
  CheckField,
  Field,
  IconField,
  ImageField,
  SectionBlock,
  StringList,
} from './fields';

const SECTION_ORDER = [
  'hero',
  'announcements',
  'nav',
  'programs',
  'pricing',
  'about',
  'faq',
  'contact',
  'registration',
  'private-lessons',
] as const;

const LABELS: Record<string, string> = {
  hero: 'الرئيسية',
  announcements: 'شريط الإعلانات',
  nav: 'القائمة والتذييل',
  programs: 'البرامج والمراحل',
  pricing: 'الأسعار والباقات',
  about: 'عن المعهد والاستديو',
  faq: 'الأسئلة الشائعة',
  contact: 'تواصل معنا',
  registration: 'صفحة التسجيل',
  'private-lessons': 'الحصص الخاصة',
};

const ICONS: Record<string, string> = {
  hero: 'fa-solid fa-house',
  announcements: 'fa-solid fa-bullhorn',
  nav: 'fa-solid fa-bars',
  programs: 'fa-solid fa-layer-group',
  pricing: 'fa-solid fa-tags',
  about: 'fa-solid fa-building-columns',
  faq: 'fa-solid fa-circle-question',
  contact: 'fa-solid fa-headset',
  registration: 'fa-solid fa-user-plus',
  'private-lessons': 'fa-solid fa-user-graduate',
};

const HINTS: Record<string, string> = {
  hero: 'عنوان الصفحة الأولى والأزرار والصور',
  announcements: 'الشريط الدوّار أعلى الموقع',
  nav: 'اسم المعهد، القائمة، والتذييل',
  programs: 'مراحل → صفوف → تفاصيل (بدون أسعار على الواجهة)',
  pricing: 'الأسعار (متوقف — الأسعار داخل البرامج)',
  about: 'من نحن، الاستديو، والمزايا',
  faq: 'الأسئلة والأجوبة',
  contact: 'بيانات التواصل ونموذج الرسالة',
  registration: 'صورة المرشدة ونصوص خطوات التسجيل في /register',
  'private-lessons': 'نموذج طلب حصة خاصة بدون تسجيل',
};

function str(v: unknown): string {
  return v == null ? '' : String(v);
}
function bool(v: unknown): boolean {
  return Boolean(v);
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function MarketingPage() {
  const canManage = useAuthStore((s) => s.hasPermission('marketing.manage'));
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MarketingSection | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newJson, setNewJson] = useState('{\n  \n}');

  const query = useQuery({
    queryKey: ['marketing-sections'],
    queryFn: async () => {
      const res = await apiClient<{ data: MarketingSection[] } | MarketingSection[]>('/marketing-sections');
      const list = Array.isArray(res) ? res : res?.data;
      return Array.isArray(list) ? list : [];
    },
    enabled: canManage,
  });

  const sections = [...(query.data ?? [])].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.section_key as (typeof SECTION_ORDER)[number]);
    const bi = SECTION_ORDER.indexOf(b.section_key as (typeof SECTION_ORDER)[number]);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    return ao - bo || a.id - b.id;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      return apiClient<MarketingSection>(`/marketing-sections/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: draft }),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ محتوى القسم');
      qc.invalidateQueries({ queryKey: ['marketing-sections'] });
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const key = newKey.trim().toLowerCase().replace(/\s+/g, '-');
      if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(key)) {
        throw new Error('section_key غير صالح (حروف إنجليزية/أرقام/_/-)');
      }
      let content: Record<string, unknown>;
      try {
        content = JSON.parse(newJson) as Record<string, unknown>;
      } catch {
        throw new Error('محتوى JSON غير صالح');
      }
      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        throw new Error('المحتوى يجب أن يكون كائن JSON');
      }
      return apiClient<MarketingSection>('/marketing-sections', {
        method: 'POST',
        body: JSON.stringify({ section_key: key, content, is_active: false }),
      });
    },
    onSuccess: () => {
      toast.success('تم إنشاء القسم');
      qc.invalidateQueries({ queryKey: ['marketing-sections'] });
      setShowAdvancedCreate(false);
      setNewKey('');
      setNewJson('{\n  \n}');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (s: MarketingSection) =>
      apiClient<MarketingSection>(`/marketing-sections/${s.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !s.is_active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-sections'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  function openEditor(s: MarketingSection) {
    const content =
      s.content && typeof s.content === 'object' && !Array.isArray(s.content)
        ? { ...s.content }
        : {};
    setEditing(s);
    setDraft(content);
  }

  async function attachMedia(path: string, mediaId: number) {
    if (!editing) return;
    try {
      const updated = await apiClient<MarketingSection>(`/marketing-sections/${editing.id}/upload`, {
        method: 'POST',
        body: JSON.stringify({ path, media_id: mediaId }),
      });
      const next =
        updated.content && typeof updated.content === 'object' && !Array.isArray(updated.content)
          ? updated.content
          : {};
      setDraft(next);
      qc.setQueryData(['marketing-sections'], (old: MarketingSection[] | undefined) =>
        (old ?? []).map((row) => (row.id === updated.id ? updated : row)),
      );
      qc.invalidateQueries({ queryKey: ['media'] });
      toast.success('تم ربط الصورة');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر ربط الصورة');
    }
  }

  if (!canManage) {
    return (
      <>
        <AdminHeader title="محتوى الموقع" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
        </AdminContent>
      </>
    );
  }

  if (editing) {
    return (
      <>
        <AdminHeader title={LABELS[editing.section_key] ?? editing.section_key} crumb="محتوى الموقع ← تعديل" />
        <AdminContent className="pb-28">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream-line bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink"
          >
            <Icon name="fa-solid fa-chevron-right" className="text-[11px]" />
            رجوع للقائمة
          </button>
          <SectionEditor
            sectionKey={editing.section_key}
            content={draft}
            setContent={setDraft}
            onPickMedia={attachMedia}
          />
        </AdminContent>
        <div className="sticky bottom-0 z-20 border-t border-cream-line bg-[#fffefb]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className={`flex justify-end ${adminContentClass}`}>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              <Icon name="fa-solid fa-floppy-disk" className="text-[12px]" />
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ القسم'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="محتوى الموقع" crumb="التسويق ← أقسام الموقع" />
      <AdminContent className="flex flex-col gap-4">
        {query.isLoading ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">جاري التحميل…</div>
        ) : sections.length === 0 ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">
            لا توجد أقسام — أنشئ قسمًا من الخيار المتقدم بالأسفل أو شغّل سيدرز المحتوى.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <article key={s.id} className="flex flex-col rounded-[18px] border border-cream-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-gold-soft">
                    <Icon name={ICONS[s.section_key] ?? 'fa-solid fa-file'} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-extrabold text-ink">
                      {LABELS[s.section_key] ?? s.section_key}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-ink-dim">
                      {HINTS[s.section_key] ?? (
                        <span className="font-latin" dir="ltr">
                          {s.section_key}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate(s)}
                    className={`relative h-6 w-11 shrink-0 rounded-full ${s.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'}`}
                    aria-label={s.is_active ? 'نشط' : 'متوقف'}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                        s.is_active ? 'right-0.5' : 'right-[22px]'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#f0ece1] pt-3">
                  <span className={`text-[12px] font-bold ${s.is_active ? 'text-[#2e7d4f]' : 'text-ink-dim'}`}>
                    {s.is_active ? 'ظاهر في الموقع' : 'مخفي عن الموقع'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditor(s)}
                    className="rounded-full bg-navy-800 px-4 py-1.5 text-[12.5px] font-bold text-white"
                  >
                    تعديل
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-[18px] border border-dashed border-cream-line2 bg-white p-4">
          <button
            type="button"
            onClick={() => setShowAdvancedCreate((v) => !v)}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-navy"
          >
            <Icon name="fa-solid fa-wrench" className="text-[12px] text-gold-deep" />
            متقدم: إضافة قسم/مفتاح جديد
          </button>
          {showAdvancedCreate ? (
            <div className="mt-3 space-y-3 border-t border-[#f0ece1] pt-3">
              <p className="text-[12px] text-ink-dim">
                للحالات النادرة فقط — قسم بلا فورم مخصص سيظهر محرّر JSON. الأفضل استخدام الأقسام العشرة المعروفة.
              </p>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-ink-soft">section_key</label>
                <input
                  className="w-full rounded-xl border border-cream-line2 bg-white px-3.5 py-2.5 font-latin text-[13.5px]"
                  dir="ltr"
                  placeholder="e.g. custom-banner"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-ink-soft">content (JSON)</label>
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-cream-line2 bg-white px-3.5 py-2.5 font-latin text-[12.5px]"
                  dir="ltr"
                  value={newJson}
                  onChange={(e) => setNewJson(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="rounded-full bg-navy-800 px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-70"
              >
                {createMutation.isPending ? 'جاري الإنشاء…' : 'إنشاء القسم'}
              </button>
            </div>
          ) : null}
        </div>
      </AdminContent>
    </>
  );
}

function SectionEditor({
  sectionKey,
  content,
  setContent,
  onPickMedia,
}: {
  sectionKey: string;
  content: Record<string, unknown>;
  setContent: (c: Record<string, unknown>) => void;
  onPickMedia: (path: string, mediaId: number) => void;
}) {
  const set = (key: string, value: unknown) => setContent({ ...content, [key]: value });
  const patchItem = <T,>(key: string, index: number, patch: Partial<T>) => {
    const list = arr<T>(content[key]);
    list[index] = { ...(list[index] as object), ...patch } as T;
    set(key, [...list]);
  };

  if (sectionKey === 'hero') {
    return (
      <div className="space-y-3">
        <SectionBlock title="الصورة الرئيسية" icon="fa-solid fa-image" hint="سحب وإفلات أو اختيار من الاستديو">
          <ImageField
            label="صورة الهيرو"
            value={content.background_image as string | number | null}
            onPick={(m) => onPickMedia('background_image', m.id)}
          />
          <ImageField
            label="شعار الخلفية (اختياري)"
            value={content.symbol_logo as string | number | null}
            onPick={(m) => onPickMedia('symbol_logo', m.id)}
          />
        </SectionBlock>

        <SectionBlock title="النصوص" icon="fa-solid fa-heading">
          <Field label="نص الشارة" value={str(content.badge_text)} onChange={(v) => set('badge_text', v)} />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="العنوان 1" value={str(content.title_line1)} onChange={(v) => set('title_line1', v)} />
            <Field label="العنوان 2" value={str(content.title_line2)} onChange={(v) => set('title_line2', v)} />
          </div>
          <Field label="الوصف" value={str(content.description)} onChange={(v) => set('description', v)} multiline />
        </SectionBlock>

        <SectionBlock title="الأزرار" icon="fa-solid fa-hand-pointer">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="زر أساسي" value={str(content.cta_primary_text)} onChange={(v) => set('cta_primary_text', v)} />
            <Field label="رابطه" value={str(content.cta_primary_link)} onChange={(v) => set('cta_primary_link', v)} dir="ltr" hint="register / programs" />
            <Field label="زر ثانوي" value={str(content.cta_secondary_text)} onChange={(v) => set('cta_secondary_text', v)} />
            <Field label="رابطه" value={str(content.cta_secondary_link)} onChange={(v) => set('cta_secondary_link', v)} dir="ltr" />
          </div>
        </SectionBlock>

        <SectionBlock title="شريط الثقة" icon="fa-solid fa-check">
          <StringList items={arr<string>(content.trust)} onChange={(v) => set('trust', v)} />
        </SectionBlock>

        <SectionBlock title="البطاقات العائمة" icon="fa-solid fa-layer-group">
          <CardList
            items={arr<Record<string, unknown>>(content.floating)}
            onChange={(v) => set('floating', v)}
            blank={{ icon: 'fa-solid fa-star', label: '' }}
            itemLabel={(item) => str(item.label) || 'بطاقة'}
            render={(item, i) => (
              <div className="grid gap-2.5 sm:grid-cols-[120px_1fr]">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('floating', i, { icon: v })} />
                <Field label="النص" value={str(item.label)} onChange={(v) => patchItem('floating', i, { label: v })} />
              </div>
            )}
          />
        </SectionBlock>

        <SectionBlock title="ميزات الشريط" icon="fa-solid fa-grip">
          <CardList
            items={arr<Record<string, unknown>>(content.heroFeatures)}
            onChange={(v) => set('heroFeatures', v)}
            blank={{ icon: 'fa-solid fa-star', title: '', desc: '' }}
            itemLabel={(item) => str(item.title) || 'ميزة'}
            render={(item, i) => (
              <div className="grid gap-2.5 sm:grid-cols-[120px_1fr_1fr]">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('heroFeatures', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('heroFeatures', i, { title: v })} />
                <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('heroFeatures', i, { desc: v })} />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'announcements') {
    return (
      <div className="space-y-4">
        <SectionBlock title="الإعلانات" icon="fa-solid fa-bullhorn" hint="تظهر بالتناوب أعلى كل صفحات الموقع">
          <CardList
            items={arr<Record<string, unknown>>(content.items)}
            onChange={(v) => set('items', v)}
            blank={{ id: `a-${Date.now()}`, icon: 'fa-solid fa-bullhorn', title: '', desc: '', cta_text: '', target_view: 'programs', bg_gradient: 'linear-gradient(100deg,#123163,#1c4b8f)' }}
            itemLabel={(item) => str(item.title) || 'إعلان'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="المعرّف" value={str(item.id)} onChange={(v) => patchItem('items', i, { id: v })} dir="ltr" />
                <IconField value={str(item.icon)} onChange={(v) => patchItem('items', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('items', i, { title: v })} />
                <Field label="نص الزر" value={str(item.cta_text)} onChange={(v) => patchItem('items', i, { cta_text: v })} />
                <div className="sm:col-span-2">
                  <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('items', i, { desc: v })} multiline />
                </div>
                <Field label="الصفحة المستهدفة" value={str(item.target_view)} onChange={(v) => patchItem('items', i, { target_view: v })} dir="ltr" hint="home / programs / private-lessons / about / faq / contact" />
                <Field label="تدرج الخلفية (CSS)" value={str(item.bg_gradient)} onChange={(v) => patchItem('items', i, { bg_gradient: v })} dir="ltr" />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'nav') {
    return (
      <div className="space-y-4">
        <SectionBlock title="هوية المعهد" icon="fa-solid fa-building">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="اسم المعهد (عربي)" value={str(content.institute_name_ar)} onChange={(v) => set('institute_name_ar', v)} />
            <Field label="اسم المعهد (إنجليزي)" value={str(content.institute_name_en)} onChange={(v) => set('institute_name_en', v)} dir="ltr" />
            <Field label="زر التسجيل" value={str(content.header_cta_primary)} onChange={(v) => set('header_cta_primary', v)} />
            <Field label="زر دخول ولي الأمر" value={str(content.header_cta_secondary)} onChange={(v) => set('header_cta_secondary', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="التذييل" icon="fa-solid fa-shoe-prints">
          <Field label="فقرة التذييل" value={str(content.footer_paragraph)} onChange={(v) => set('footer_paragraph', v)} multiline />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="عنوان الروابط" value={str(content.footer_links_title)} onChange={(v) => set('footer_links_title', v)} />
            <Field label="عنوان التواصل" value={str(content.footer_contact_title)} onChange={(v) => set('footer_contact_title', v)} />
            <Field label="عنوان الدوام" value={str(content.footer_hours_title)} onChange={(v) => set('footer_hours_title', v)} />
            <Field label="بادئة الإدارة" value={str(content.footer_management_prefix)} onChange={(v) => set('footer_management_prefix', v)} />
            <Field label="حقوق النشر" value={str(content.footer_copyright)} onChange={(v) => set('footer_copyright', v)} dir="ltr" />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#8a8276]">
            ترتيب أعمدة الفوتر: الهوية · الروابط · التواصل · الدوام
          </p>
        </SectionBlock>
        <SectionBlock title="روابط القائمة" icon="fa-solid fa-bars">
          <NavItemsEditor items={arr<Record<string, unknown>>(content.nav_items)} onChange={(v) => set('nav_items', v)} />
        </SectionBlock>
        <SectionBlock title="شريط الجوال" icon="fa-solid fa-mobile-screen">
          <NavItemsEditor items={arr<Record<string, unknown>>(content.tab_items)} onChange={(v) => set('tab_items', v)} />
        </SectionBlock>
        <SectionBlock title="روابط قانونية" icon="fa-solid fa-scale-balanced">
          <CardList
            items={arr<Record<string, unknown>>(content.footer_legal_links)}
            onChange={(v) => set('footer_legal_links', v)}
            blank={{ label: '', url: '#' }}
            itemLabel={(item) => str(item.label) || 'رابط'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="النص" value={str(item.label)} onChange={(v) => patchItem('footer_legal_links', i, { label: v })} />
                <Field label="الرابط" value={str(item.url)} onChange={(v) => patchItem('footer_legal_links', i, { url: v })} dir="ltr" />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="حسابات التواصل" icon="fa-solid fa-share-nodes">
          <CardList
            items={arr<Record<string, unknown>>(content.social_links)}
            onChange={(v) => set('social_links', v)}
            blank={{ platform: 'instagram', url: '' }}
            itemLabel={(item) => str(item.platform) || 'حساب'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="المنصة" value={str(item.platform)} onChange={(v) => patchItem('social_links', i, { platform: v })} dir="ltr" />
                <Field label="الرابط" value={str(item.url)} onChange={(v) => patchItem('social_links', i, { url: v })} dir="ltr" />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'programs') {
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان القسم" icon="fa-solid fa-heading">
          <Field label="سطر لاتيني صغير" value={str(content.section_eyebrow)} onChange={(v) => set('section_eyebrow', v)} dir="ltr" />
          <Field label="عنوان القسم" value={str(content.section_title)} onChange={(v) => set('section_title', v)} />
          <Field label="وصف القسم" value={str(content.section_sub)} onChange={(v) => set('section_sub', v)} multiline />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="زر استكشاف المرحلة" value={str(content.explore_cta)} onChange={(v) => set('explore_cta', v)} />
            <Field label="زر عرض الصف" value={str(content.grades_cta)} onChange={(v) => set('grades_cta', v)} />
            <Field label="زر التسجيل" value={str(content.program_cta)} onChange={(v) => set('program_cta', v)} />
            <Field label="زر حصة VIP" value={str(content.vip_cta)} onChange={(v) => set('vip_cta', v)} />
            <Field label="العملة" value={str(content.currency)} onChange={(v) => set('currency', v)} />
            <Field label="تسمية الباقة الشاملة" value={str(content.package_label)} onChange={(v) => set('package_label', v)} />
            <Field label="تسمية المواد المفردة" value={str(content.single_subjects_label)} onChange={(v) => set('single_subjects_label', v)} />
            <Field label="عنوان المميزات" value={str(content.features_title)} onChange={(v) => set('features_title', v)} />
            <Field label="عنوان الباقات" value={str(content.packages_title)} onChange={(v) => set('packages_title', v)} />
            <Field label="زر الرجوع" value={str(content.back_label)} onChange={(v) => set('back_label', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="بطاقات المراحل (صورة بدون أسعار)" icon="fa-solid fa-images">
          <CardList
            items={arr<Record<string, unknown>>(content.stage_cards)}
            onChange={(v) => set('stage_cards', v)}
            blank={{ stage_id: '', image: null, badge: '', short_desc: '' }}
            itemLabel={(item) => str(item.short_desc) || (str(item.stage_id) ? `مرحلة #${str(item.stage_id)}` : 'بطاقة مرحلة')}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="معرّف المرحلة (ID)" value={str(item.stage_id)} onChange={(v) => patchItem('stage_cards', i, { stage_id: v })} dir="ltr" hint="من جدول المراحل في النظام" />
                <Field label="الشارة" value={str(item.badge)} onChange={(v) => patchItem('stage_cards', i, { badge: v })} />
                <div className="sm:col-span-2">
                  <Field label="وصف قصير (بدون أسعار)" value={str(item.short_desc)} onChange={(v) => patchItem('stage_cards', i, { short_desc: v })} />
                </div>
                <ImageField label="صورة المرحلة" value={item.image as string | number | null} onPick={(m) => onPickMedia(`stage_cards.${i}.image`, m.id)} />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="المميزات (تظهر داخل صفحة الصف)" icon="fa-solid fa-star">
          <CardList
            items={arr<Record<string, unknown>>(content.features)}
            onChange={(v) => set('features', v)}
            blank={{ icon: 'fa-solid fa-star', title: '', desc: '' }}
            itemLabel={(item) => str(item.title) || 'ميزة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('features', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('features', i, { title: v })} />
                <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('features', i, { desc: v })} unused />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="رسائل الحالة" icon="fa-solid fa-message">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="جارٍ التحميل" value={str(content.loading_label)} onChange={(v) => set('loading_label', v)} />
            <Field label="خطأ التحميل" value={str(content.error_label)} onChange={(v) => set('error_label', v)} />
            <Field label="لا توجد صفوف" value={str(content.empty_grades)} onChange={(v) => set('empty_grades', v)} />
            <Field label="لا توجد باقة شاملة" value={str(content.empty_package)} onChange={(v) => set('empty_package', v)} />
            <Field label="لا توجد مواد مفردة" value={str(content.empty_subjects)} onChange={(v) => set('empty_subjects', v)} />
            <Field label="عنوان صفحة الصفوف" value={str(content.grades_heading)} onChange={(v) => set('grades_heading', v)} />
            <Field label="وصف صفحة الصف" value={str(content.grade_heading)} onChange={(v) => set('grade_heading', v)} />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#8a8276]">
            الواجهة: بطاقات مراحل (صورة + استكشاف) → صفحات الصفوف → صفحة الصف (مميزات + باقات + أسعار مواد + حصة VIP). الأسعار تظهر فقط داخل صفحة الصف.
          </p>
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'pricing') {
    const offer = obj(content.featured_offer);
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان القسم" icon="fa-solid fa-heading">
          <Field label="سطر لاتيني صغير" value={str(content.section_eyebrow)} onChange={(v) => set('section_eyebrow', v)} dir="ltr" />
          <Field label="عنوان القسم" value={str(content.section_title)} onChange={(v) => set('section_title', v)} />
          <Field label="وصف القسم" value={str(content.section_sub)} onChange={(v) => set('section_sub', v)} multiline />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="زر الباقة" value={str(content.plan_cta)} onChange={(v) => set('plan_cta', v)} />
            <Field label="العملة" value={str(content.currency)} onChange={(v) => set('currency', v)} />
            <Field label="عنوان المجموعات" value={str(content.groups_title)} onChange={(v) => set('groups_title', v)} />
            <Field label="عنوان مزايا ولي الأمر" value={str(content.parent_gets_title)} onChange={(v) => set('parent_gets_title', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="العرض المبرّز" icon="fa-solid fa-fire">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="شارة العرض" value={str(offer.badge_text)} onChange={(v) => set('featured_offer', { ...offer, badge_text: v })} />
            <Field label="عنوان العرض" value={str(offer.title)} onChange={(v) => set('featured_offer', { ...offer, title: v })} />
            <Field label="السعر الحالي" value={str(offer.price_current)} onChange={(v) => set('featured_offer', { ...offer, price_current: v })} dir="ltr" />
            <Field label="السعر الأصلي" value={str(offer.price_original)} onChange={(v) => set('featured_offer', { ...offer, price_original: v })} dir="ltr" />
            <Field label="نص الخصم" value={str(offer.discount_text)} onChange={(v) => set('featured_offer', { ...offer, discount_text: v })} />
            <Field label="نص الزر" value={str(offer.cta_text)} onChange={(v) => set('featured_offer', { ...offer, cta_text: v })} />
            <Field label="وحدة السعر" value={str(offer.unit_label)} onChange={(v) => set('featured_offer', { ...offer, unit_label: v })} />
          </div>
        </SectionBlock>
        <SectionBlock title="الباقات" icon="fa-solid fa-tags">
          <CardList
            items={arr<Record<string, unknown>>(content.pricingPlans)}
            onChange={(v) => set('pricingPlans', v)}
            blank={{ id: '', programId: null, name: '', note: '', price: '', originalPrice: '', discountLabel: '', offerStart: '', offerEnd: '' }}
            itemLabel={(item) => str(item.name) || 'باقة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="المعرّف" value={str(item.id)} onChange={(v) => patchItem('pricingPlans', i, { id: v })} dir="ltr" />
                <Field label="الاسم" value={str(item.name)} onChange={(v) => patchItem('pricingPlans', i, { name: v })} />
                <Field label="ملاحظة" value={str(item.note)} onChange={(v) => patchItem('pricingPlans', i, { note: v })} />
                <Field label="السعر" value={str(item.price)} onChange={(v) => patchItem('pricingPlans', i, { price: v })} dir="ltr" />
                <Field label="السعر الأصلي" value={str(item.originalPrice)} onChange={(v) => patchItem('pricingPlans', i, { originalPrice: v })} dir="ltr" />
                <Field label="وسم الخصم" value={str(item.discountLabel)} onChange={(v) => patchItem('pricingPlans', i, { discountLabel: v })} unused />
                <Field label="بداية العرض" value={str(item.offerStart)} onChange={(v) => patchItem('pricingPlans', i, { offerStart: v })} dir="ltr" unused />
                <Field label="نهاية العرض" value={str(item.offerEnd)} onChange={(v) => patchItem('pricingPlans', i, { offerEnd: v })} dir="ltr" unused />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="المجموعات" icon="fa-solid fa-clock">
          <CardList
            items={arr<Record<string, unknown>>(content.groups)}
            onChange={(v) => set('groups', v)}
            blank={{ id: `g-${Date.now()}`, days: '', time: '', seats: '', open: true }}
            itemLabel={(item) => str(item.days) || 'مجموعة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="الأيام" value={str(item.days)} onChange={(v) => patchItem('groups', i, { days: v })} />
                <Field label="الوقت" value={str(item.time)} onChange={(v) => patchItem('groups', i, { time: v })} dir="ltr" />
                <Field label="المقاعد" value={str(item.seats)} onChange={(v) => patchItem('groups', i, { seats: v })} />
                <CheckField label="مفتوحة" checked={bool(item.open)} onChange={(v) => patchItem('groups', i, { open: v })} />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="ما يشمله الاشتراك" icon="fa-solid fa-gift">
          <CardList
            items={arr<Record<string, unknown>>(content.parentGets)}
            onChange={(v) => set('parentGets', v)}
            blank={{ icon: 'fa-solid fa-star', title: '', desc: '' }}
            itemLabel={(item) => str(item.title) || 'ميزة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('parentGets', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('parentGets', i, { title: v })} />
                <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('parentGets', i, { desc: v })} unused />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'about') {
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان الصفحة" icon="fa-solid fa-heading">
          <Field label="سطر لاتيني صغير" value={str(content.eyebrow)} onChange={(v) => set('eyebrow', v)} dir="ltr" />
          <Field label="العنوان" value={str(content.title)} onChange={(v) => set('title', v)} />
          <Field label="الوصف" value={str(content.sub)} onChange={(v) => set('sub', v)} multiline />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="عنوان لماذا نحن" value={str(content.why_us_title)} onChange={(v) => set('why_us_title', v)} />
            <Field label="عنوان قسم الدوام" value={str(content.info_section_title)} onChange={(v) => set('info_section_title', v)} />
            <Field label="عنوان الاستديو" value={str(content.studio_title)} onChange={(v) => set('studio_title', v)} />
            <Field label="وصف الاستديو" value={str(content.studio_section_sub)} onChange={(v) => set('studio_section_sub', v)} />
            <Field label="تسمية أيام الدوام" value={str(content.days_label)} onChange={(v) => set('days_label', v)} />
            <Field label="ملاحظة الأيام" value={str(content.days_note)} onChange={(v) => set('days_note', v)} />
            <Field label="تسمية وقت الدوام" value={str(content.hours_label)} onChange={(v) => set('hours_label', v)} />
            <Field label="تسمية الإدارة" value={str(content.management_label)} onChange={(v) => set('management_label', v)} />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#8a8276]">
            ترتيب الصفحة: المقدمة → لماذا نحن → الدوام والإدارة → الاستديو (آخر قسم).
          </p>
        </SectionBlock>
        <SectionBlock title="المزايا (القسم الأول)" icon="fa-solid fa-star">
          <CardList
            items={arr<Record<string, unknown>>(content.benefits)}
            onChange={(v) => set('benefits', v)}
            blank={{ icon: 'fa-solid fa-star', title: '', desc: '' }}
            itemLabel={(item) => str(item.title) || 'ميزة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('benefits', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('benefits', i, { title: v })} />
                <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('benefits', i, { desc: v })} />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="تصنيفات الاستديو (آخر قسم في الصفحة)" icon="fa-solid fa-folder">
          <CardList
            items={arr<Record<string, unknown>>(content.studio_cats)}
            onChange={(v) => set('studio_cats', v)}
            blank={{ id: '', label: '' }}
            itemLabel={(item) => str(item.label) || 'تصنيف'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="المعرّف" value={str(item.id)} onChange={(v) => patchItem('studio_cats', i, { id: v })} dir="ltr" />
                <Field label="الاسم" value={str(item.label)} onChange={(v) => patchItem('studio_cats', i, { label: v })} />
              </div>
            )}
          />
        </SectionBlock>
        <SectionBlock title="صور الاستديو" icon="fa-solid fa-camera">
          <CardList
            items={arr<Record<string, unknown>>(content.studio_items)}
            onChange={(v) => set('studio_items', v)}
            blank={{ id: `s-${Date.now()}`, cat: 'classes', title: '', ph: '', src: null }}
            itemLabel={(item) => str(item.title) || 'صورة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="المعرّف" value={str(item.id)} onChange={(v) => patchItem('studio_items', i, { id: v })} dir="ltr" />
                <Field label="التصنيف" value={str(item.cat)} onChange={(v) => patchItem('studio_items', i, { cat: v })} dir="ltr" />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('studio_items', i, { title: v })} />
                <Field label="نص البديل" value={str(item.ph)} onChange={(v) => patchItem('studio_items', i, { ph: v })} />
                <div className="sm:col-span-2">
                  <ImageField label="الصورة" value={item.src as string | number | null} onPick={(m) => onPickMedia(`studio_items.${i}.src`, m.id)} />
                </div>
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'private-lessons') {
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان الصفحة" icon="fa-solid fa-heading">
          <Field label="سطر لاتيني صغير" value={str(content.section_eyebrow)} onChange={(v) => set('section_eyebrow', v)} dir="ltr" />
          <Field label="عنوان الصفحة" value={str(content.section_title)} onChange={(v) => set('section_title', v)} />
          <Field label="وصف الصفحة" value={str(content.section_sub)} onChange={(v) => set('section_sub', v)} multiline />
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#8a8276]">
            الصفحة تعرض نموذج طلب عام (بدون باقات). الطلبات تصل كـ pop-up ثم تُدار من «طلبات الحصص الخاصة».
          </p>
        </SectionBlock>
        <SectionBlock title="نصوص النموذج" icon="fa-solid fa-wpforms">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="عنوان النموذج" value={str(content.form_title)} onChange={(v) => set('form_title', v)} />
            <Field label="زر الإرسال" value={str(content.submit_label)} onChange={(v) => set('submit_label', v)} />
            <Field label="جارٍ الإرسال" value={str(content.submitting_label)} onChange={(v) => set('submitting_label', v)} />
            <Field label="عنوان النجاح" value={str(content.success_title)} onChange={(v) => set('success_title', v)} />
            <Field label="رسالة النجاح" value={str(content.success_message)} onChange={(v) => set('success_message', v)} />
            <Field label="زر طلب آخر" value={str(content.success_cta)} onChange={(v) => set('success_cta', v)} />
            <Field label="اسم الطالب" value={str(content.student_name_label)} onChange={(v) => set('student_name_label', v)} />
            <Field label="رقم التواصل" value={str(content.phone_label)} onChange={(v) => set('phone_label', v)} />
            <Field label="رقم تواصل ثاني" value={str(content.phone_secondary_label)} onChange={(v) => set('phone_secondary_label', v)} />
            <Field label="الصف" value={str(content.grade_label)} onChange={(v) => set('grade_label', v)} />
            <Field label="المادة" value={str(content.subject_label)} onChange={(v) => set('subject_label', v)} />
            <Field label="عدد الساعات" value={str(content.hours_label)} onChange={(v) => set('hours_label', v)} />
            <Field label="placeholder الصف" value={str(content.grade_placeholder)} onChange={(v) => set('grade_placeholder', v)} />
            <Field label="placeholder المادة" value={str(content.subject_placeholder)} onChange={(v) => set('subject_placeholder', v)} />
            <Field label="placeholder الساعات" value={str(content.hours_placeholder)} onChange={(v) => set('hours_placeholder', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="مميزات بجانب النموذج" icon="fa-solid fa-star">
          <CardList
            items={arr<Record<string, unknown>>(content.default_features)}
            onChange={(v) => set('default_features', v)}
            blank={{ icon: 'fa-solid fa-check', title: '', desc: '' }}
            itemLabel={(item) => str(item.title) || 'ميزة'}
            render={(item, i) => (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <IconField value={str(item.icon)} onChange={(v) => patchItem('default_features', i, { icon: v })} />
                <Field label="العنوان" value={str(item.title)} onChange={(v) => patchItem('default_features', i, { title: v })} />
                <Field label="الوصف" value={str(item.desc)} onChange={(v) => patchItem('default_features', i, { desc: v })} unused />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'faq') {
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان الصفحة" icon="fa-solid fa-heading">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="سطر لاتيني صغير" value={str(content.page_eyebrow)} onChange={(v) => set('page_eyebrow', v)} dir="ltr" />
            <Field label="عنوان الصفحة" value={str(content.page_title)} onChange={(v) => set('page_title', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="الأسئلة" icon="fa-solid fa-circle-question">
          <CardList
            items={arr<Record<string, unknown>>(content.faqs)}
            onChange={(v) => set('faqs', v)}
            blank={{ q: '', a: '' }}
            itemLabel={(item) => str(item.q) || 'سؤال'}
            render={(item, i) => (
              <div className="grid gap-3.5 lg:grid-cols-2">
                <Field label="السؤال" value={str(item.q)} onChange={(v) => patchItem('faqs', i, { q: v })} />
                <Field label="الجواب" value={str(item.a)} onChange={(v) => patchItem('faqs', i, { a: v })} multiline />
              </div>
            )}
          />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'contact') {
    const labels = obj(content.form_labels);
    const formLabelNames: Record<string, string> = {
      name: 'حقل الاسم',
      phone: 'حقل الواتساب',
      phone_secondary: 'حقل الرقم الثاني',
      stage: 'حقل المرحلة',
      message: 'حقل الرسالة',
      submit: 'زر الإرسال',
      submitting: 'نص أثناء الإرسال',
      stage_placeholder: 'نص اختيار المرحلة',
      name_placeholder: 'مثال الاسم',
      phone_placeholder: 'مثال الهاتف',
      message_placeholder: 'مثال الرسالة',
    };
    return (
      <div className="space-y-4">
        <SectionBlock title="عنوان الصفحة" icon="fa-solid fa-heading">
          <Field label="سطر لاتيني صغير" value={str(content.page_eyebrow)} onChange={(v) => set('page_eyebrow', v)} dir="ltr" />
          <Field label="عنوان الصفحة" value={str(content.page_title)} onChange={(v) => set('page_title', v)} />
          <Field label="وصف الصفحة" value={str(content.page_description)} onChange={(v) => set('page_description', v)} multiline />
        </SectionBlock>
        <SectionBlock title="بيانات التواصل" icon="fa-solid fa-phone">
          <StringList items={arr<string>(content.phones)} onChange={(v) => set('phones', v)} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="الإدارة" value={str(content.management)} onChange={(v) => set('management', v)} />
            <Field label="الدولة" value={str(content.country)} onChange={(v) => set('country', v)} />
            <Field label="أيام الدوام" value={str(content.days)} onChange={(v) => set('days', v)} />
            <Field label="ساعات الدوام" value={str(content.hours)} onChange={(v) => set('hours', v)} dir="ltr" />
          </div>
        </SectionBlock>
        <SectionBlock title="تسميات النموذج" icon="fa-solid fa-pen-to-square">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {Object.keys(formLabelNames).map((k) => (
              <Field
                key={k}
                label={formLabelNames[k]}
                value={str(labels[k])}
                onChange={(v) => set('form_labels', { ...labels, [k]: v })}
              />
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="رسالة النجاح" icon="fa-solid fa-circle-check">
          <Field label="العنوان" value={str(content.success_title)} onChange={(v) => set('success_title', v)} />
          <Field label="النص" value={str(content.success_message)} onChange={(v) => set('success_message', v)} />
          <Field label="زر إعادة الإرسال" value={str(content.success_cta)} onChange={(v) => set('success_cta', v)} />
        </SectionBlock>
      </div>
    );
  }

  if (sectionKey === 'registration') {
    return (
      <div className="space-y-4">
        <SectionBlock title="صورة صفحة التسجيل" icon="fa-solid fa-image" hint="تظهر بجانب خطوات التسجيل بدل الرسم الافتراضي لسارة">
          <ImageField
            label="صورة المرشدة / الشخصية"
            value={content.aside_image as string | number | null}
            onPick={(m) => onPickMedia('aside_image', m.id)}
          />
        </SectionBlock>
        <SectionBlock title="المرشدة" icon="fa-solid fa-user">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="الاسم" value={str(content.guide_name)} onChange={(v) => set('guide_name', v)} />
            <Field label="المسمى" value={str(content.guide_role)} onChange={(v) => set('guide_role', v)} />
          </div>
        </SectionBlock>
        <SectionBlock title="نصوص الخطوات (سارة)" icon="fa-solid fa-comments" hint="سطر لكل خطوة من 1 إلى 7">
          <StringList items={arr<string>(content.mascot_lines)} onChange={(v) => set('mascot_lines', v)} />
        </SectionBlock>
        <SectionBlock title="عناوين الخطوات" icon="fa-solid fa-list-ol">
          <StringList items={arr<string>(content.step_labels)} onChange={(v) => set('step_labels', v)} />
        </SectionBlock>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionBlock
        title="محرّر JSON (قسم مخصص)"
        icon="fa-solid fa-code"
        hint="لا يوجد فورم مخصص لهذا القسم — عدّل JSON بحذر"
      >
        <textarea
          className="min-h-[320px] w-full rounded-xl border border-cream-line2 bg-white px-3.5 py-2.5 font-latin text-[12.5px] text-ink"
          dir="ltr"
          value={JSON.stringify(content ?? {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                setContent(parsed);
              }
            } catch {
              // keep typing until valid JSON
            }
          }}
        />
      </SectionBlock>
    </div>
  );
}

function NavItemsEditor({
  items,
  onChange,
}: {
  items: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
}) {
  return (
    <CardList
      items={items}
      onChange={onChange}
      blank={{ view_id: 'home', label: '', icon: 'fa-solid fa-circle' }}
      itemLabel={(item) => str(item.label) || 'رابط'}
      render={(item, i) => (
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field
            label="الصفحة"
            value={str(item.view_id)}
            onChange={(v) => {
              const next = [...items];
              next[i] = { ...item, view_id: v };
              onChange(next);
            }}
            dir="ltr"
          />
          <Field
            label="النص"
            value={str(item.label)}
            onChange={(v) => {
              const next = [...items];
              next[i] = { ...item, label: v };
              onChange(next);
            }}
          />
          <IconField
            value={str(item.icon)}
            onChange={(v) => {
              const next = [...items];
              next[i] = { ...item, icon: v };
              onChange(next);
            }}
          />
        </div>
      )}
    />
  );
}
