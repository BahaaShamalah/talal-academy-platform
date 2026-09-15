'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
import { SettingsSection } from '@/components/settings/settings-shared';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { apiClient, type InstituteSetting, type PrivateLessonPeriod } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  institute_name_ar: string;
  institute_name_en: string;
  address: string;
  phone: string;
  email: string;
  commercial_registration_number: string;
  invoice_footer_note: string;
  director_name: string;
};

function newPeriodId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptyPeriod(): PrivateLessonPeriod {
  return {
    id: newPeriodId(),
    name_ar: '',
    start_time: '16:00',
    end_time: '18:00',
    is_active: true,
  };
}

export function InstituteSettingsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('settings.manage'));
  const qc = useQueryClient();
  const printPreviewHref = '/print/example';

  const [form, setForm] = useState<FormState | null>(null);
  const [periods, setPeriods] = useState<PrivateLessonPeriod[]>([]);
  const [logoId, setLogoId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stampId, setStampId] = useState<number | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeStamp, setRemoveStamp] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: async () => {
      const data = await apiClient<InstituteSetting>('/settings/institute');
      setForm({
        institute_name_ar: data.institute_name_ar ?? '',
        institute_name_en: data.institute_name_en ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        commercial_registration_number: data.commercial_registration_number ?? '',
        invoice_footer_note: data.invoice_footer_note ?? '',
        director_name: data.director_name ?? '',
      });
      setPeriods(
        (data.private_lesson_periods ?? []).map((p) => ({
          ...p,
          start_time: String(p.start_time).slice(0, 5),
          end_time: String(p.end_time).slice(0, 5),
          is_active: p.is_active !== false,
        })),
      );
      setLogoId(data.logo_media_id ?? null);
      setLogoUrl(data.logo_url ?? null);
      setStampId(data.stamp_media_id ?? null);
      setStampUrl(data.stamp_url ?? null);
      setRemoveLogo(false);
      setRemoveStamp(false);
      return data;
    },
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      for (const p of periods) {
        if (!p.name_ar.trim()) throw new Error('أدخل اسم كل فترة');
        if (!p.start_time || !p.end_time) throw new Error('حدد وقت البداية والنهاية لكل فترة');
        if (p.end_time <= p.start_time) throw new Error(`نهاية «${p.name_ar}» يجب أن تكون بعد البداية`);
      }

      const payload: Record<string, unknown> = {
        institute_name_ar: form.institute_name_ar.trim(),
        institute_name_en: form.institute_name_en.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        commercial_registration_number: form.commercial_registration_number.trim() || null,
        invoice_footer_note: form.invoice_footer_note.trim() || null,
        director_name: form.director_name.trim() || null,
        private_lesson_periods: periods.map((p) => ({
          id: p.id,
          name_ar: p.name_ar.trim(),
          start_time: p.start_time,
          end_time: p.end_time,
          is_active: p.is_active !== false,
        })),
      };
      if (removeLogo) payload.remove_logo = true;
      else if (logoId) payload.logo_media_id = logoId;
      if (removeStamp) payload.remove_stamp = true;
      else if (stampId) payload.stamp_media_id = stampId;

      return apiClient<InstituteSetting>('/settings/institute', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      toast.success('تم حفظ إعدادات المعهد');
      setRemoveLogo(false);
      setRemoveStamp(false);
      if (data) {
        setLogoId(data.logo_media_id ?? null);
        setLogoUrl(data.logo_url ?? null);
        setStampId(data.stamp_media_id ?? null);
        setStampUrl(data.stamp_url ?? null);
        if (data.private_lesson_periods) {
          setPeriods(
            data.private_lesson_periods.map((p) => ({
              ...p,
              start_time: String(p.start_time).slice(0, 5),
              end_time: String(p.end_time).slice(0, 5),
              is_active: p.is_active !== false,
            })),
          );
        }
        qc.setQueryData(['institute-settings'], data);
      }
      qc.invalidateQueries({ queryKey: ['institute-settings'] });
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function updatePeriod(id: string, patch: Partial<PrivateLessonPeriod>) {
    setPeriods((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  if (!canManage) {
    return (
      <>
        <AdminHeader title="إعدادات المعهد" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="إعدادات المعهد" crumb="النظام ← الهوية والفواتير" />

      <AdminContent className="flex flex-col gap-4">
        <a
          href={printPreviewHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-[14px] border border-cream-line bg-white px-3.5 py-2 text-[13px] font-bold text-navy hover:bg-[#faf8f3]"
        >
          <Icon name="fa-solid fa-print" className="text-[13px] text-gold-deep" />
          معاينة قالب الطباعة الرسمي (A4)
        </a>

        {settingsQuery.isLoading || !form ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">
            جاري التحميل…
          </div>
        ) : (
          <>
            <SettingsSection title="هوية المعهد" icon="fa-solid fa-image">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MediaPicker
                  label="شعار المعهد"
                  valueId={removeLogo ? null : logoId}
                  valueUrl={removeLogo ? null : logoUrl}
                  onChange={(m) => {
                    setLogoId(m.id);
                    setLogoUrl(m.url);
                    setRemoveLogo(false);
                  }}
                  onClear={() => {
                    setLogoId(null);
                    setLogoUrl(null);
                    setRemoveLogo(true);
                  }}
                />
                <MediaPicker
                  label="الختم / التوقيع"
                  valueId={removeStamp ? null : stampId}
                  valueUrl={removeStamp ? null : stampUrl}
                  onChange={(m) => {
                    setStampId(m.id);
                    setStampUrl(m.url);
                    setRemoveStamp(false);
                  }}
                  onClear={() => {
                    setStampId(null);
                    setStampUrl(null);
                    setRemoveStamp(true);
                  }}
                />
              </div>
            </SettingsSection>

            <SettingsSection title="بيانات المعهد" icon="fa-solid fa-building">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>اسم المعهد (عربي)</label>
                  <input
                    className={formFieldClass}
                    value={form.institute_name_ar}
                    onChange={(e) => setForm((f) => (f ? { ...f, institute_name_ar: e.target.value } : f))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>اسم المعهد (إنجليزي)</label>
                  <input
                    className={formFieldClass}
                    dir="ltr"
                    value={form.institute_name_en}
                    onChange={(e) => setForm((f) => (f ? { ...f, institute_name_en: e.target.value } : f))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>العنوان</label>
                  <input
                    className={formFieldClass}
                    value={form.address}
                    onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
                  />
                </div>
                <div>
                  <label className={formLabelClass}>الهاتف</label>
                  <input
                    className={formFieldClass}
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                  />
                </div>
                <div>
                  <label className={formLabelClass}>البريد</label>
                  <input
                    className={formFieldClass}
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>السجل التجاري</label>
                  <input
                    className={formFieldClass}
                    value={form.commercial_registration_number}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, commercial_registration_number: e.target.value } : f))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>اسم المدير (لتوقيع الطباعة)</label>
                  <input
                    className={formFieldClass}
                    value={form.director_name}
                    onChange={(e) => setForm((f) => (f ? { ...f, director_name: e.target.value } : f))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelClass}>ملاحظة تذييل الفاتورة</label>
                  <textarea
                    className={`${formFieldClass} min-h-[88px]`}
                    value={form.invoice_footer_note}
                    onChange={(e) => setForm((f) => (f ? { ...f, invoice_footer_note: e.target.value } : f))}
                  />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="مواعيد الحصص الخاصة" icon="fa-regular fa-clock">
              <p className="mb-4 text-[13px] text-ink-dim">
                فترات ثابتة تظهر لولي الأمر عند الطلب (مثل الصباحية أو المسائية، أو من ساعة لساعة).
              </p>
              <div className="space-y-3">
                {periods.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 items-end gap-3 rounded-[14px] border border-cream-line bg-cream-soft/60 p-3.5 sm:grid-cols-[1.4fr_1fr_1fr_auto_auto]"
                  >
                    <div>
                      <label className={formLabelClass}>اسم الفترة</label>
                      <input
                        className={formFieldClass}
                        placeholder="مثال: الفترة المسائية"
                        value={p.name_ar}
                        onChange={(e) => updatePeriod(p.id, { name_ar: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>من</label>
                      <input
                        type="time"
                        className={formFieldClass}
                        value={p.start_time}
                        onChange={(e) => updatePeriod(p.id, { start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>إلى</label>
                      <input
                        type="time"
                        className={formFieldClass}
                        value={p.end_time}
                        onChange={(e) => updatePeriod(p.id, { end_time: e.target.value })}
                      />
                    </div>
                    <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                      <input
                        type="checkbox"
                        checked={p.is_active !== false}
                        onChange={(e) => updatePeriod(p.id, { is_active: e.target.checked })}
                      />
                      نشط
                    </label>
                    <button
                      type="button"
                      onClick={() => setPeriods((rows) => rows.filter((r) => r.id !== p.id))}
                      className="mb-1.5 inline-flex h-[42px] items-center justify-center rounded-xl border border-[#f0d0d0] bg-white px-3 text-[#a34b4b]"
                      title="حذف"
                    >
                      <Icon name="fa-solid fa-trash" className="text-[12px]" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPeriods((rows) => [...rows, emptyPeriod()])}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2 text-[12.5px] font-bold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[11px]" />
                إضافة فترة
              </button>
            </SettingsSection>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
              >
                {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
              </button>
            </div>
          </>
        )}
      </AdminContent>
    </>
  );
}
