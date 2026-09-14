'use client';

import { useEffect, useRef, useState } from 'react';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import { accountField, accountLabel, type Guardian, unwrapOne } from '@/lib/account';
import { personInitials } from '@/lib/portal';

export default function PortalAccountPage() {
  const { guardian, setGuardian } = usePortal();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guardian) return;
    setName(guardian.full_name ?? '');
    setEmail(guardian.email ?? '');
    setPhone(guardian.phone ?? '');
    setAvatarUrl(guardian.avatar_url ?? null);
  }, [guardian]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function applyGuardian(g: Guardian) {
    setGuardian(g);
    setName(g.full_name ?? '');
    setEmail(g.email ?? '');
    setPhone(g.phone ?? '');
    setAvatarUrl(g.avatar_url ?? null);
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/guardian/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر الحفظ');
        return;
      }
      const g = unwrapOne<Guardian>(json);
      if (g) applyGuardian(g);
      setMessage('تم حفظ بيانات الحساب');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setError('');
    setMessage('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/guardian/me/avatar', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر رفع الصورة');
        return;
      }
      const g = unwrapOne<Guardian>(json);
      if (g) applyGuardian(g);
      setPreviewUrl(null);
      setMessage('تم تحديث الصورة الشخصية');
    } catch {
      setError('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onRemoveAvatar() {
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/guardian/me/avatar', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر حذف الصورة');
        return;
      }
      const g = unwrapOne<Guardian>(json);
      if (g) applyGuardian(g);
      setPreviewUrl(null);
      setMessage('تم حذف الصورة الشخصية');
    } catch {
      setError('حدث خطأ أثناء حذف الصورة');
    } finally {
      setUploading(false);
    }
  }

  const displayAvatar = previewUrl || avatarUrl;
  const displayName = name.trim() || 'ولي الأمر';

  return (
    <PortalPage title="حسابي" crumb="بيانات الحساب والصورة الشخصية" showSwitcher={false}>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <section
          id="avatar"
          className="scroll-mt-24 rounded-2xl border border-cream-line bg-white p-5"
        >
          <div className="mb-4">
            <h2 className="text-[16px] font-extrabold text-navy-800">الصورة الشخصية</h2>
            <p className="mt-1 text-[12.5px] text-ink-dim">
              تظهر في أعلى البورتال بجانب اسمك. يُفضّل صورة مربعة واضحة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-800 text-[22px] font-bold text-gold-soft">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                personInitials(displayName)
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-navy/55 text-[11px] font-bold text-white">
                  جاري…
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-[13px] font-extrabold text-navy disabled:opacity-60"
              >
                <Icon name="fa-solid fa-camera" className="text-[12px]" />
                {avatarUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void onRemoveAvatar()}
                  className="inline-flex items-center gap-2 rounded-full border border-cream-line2 bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft disabled:opacity-60"
                >
                  <Icon name="fa-solid fa-trash" className="text-[11px]" />
                  حذف
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <form
          onSubmit={onSaveProfile}
          className="space-y-3 rounded-2xl border border-cream-line bg-white p-5"
        >
          <div className="mb-1">
            <h2 className="text-[16px] font-extrabold text-navy-800">بيانات الحساب</h2>
            <p className="mt-1 text-[12.5px] text-ink-dim">حدّث الاسم والبريد الإلكتروني.</p>
          </div>

          <div>
            <label className={accountLabel}>رقم الهاتف</label>
            <input className={accountField} value={phone} disabled dir="ltr" />
          </div>
          <div>
            <label className={accountLabel}>الاسم</label>
            <input
              className={accountField}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={accountLabel}>البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              className={accountField}
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}
          {message ? <p className="text-[13px] text-[#2e7d4f]">{message}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-navy px-4 py-3 text-[14px] font-extrabold text-white disabled:opacity-60"
          >
            {saving ? 'جاري الحفظ…' : 'حفظ البيانات'}
          </button>
        </form>
      </div>
    </PortalPage>
  );
}
