'use client';

import { useEffect, useState } from 'react';
import { accountField, accountLabel, type Guardian, unwrapOne } from '@/lib/account';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/guardian/me');
      const json = await res.json();
      if (res.ok) {
        const g = unwrapOne<Guardian>(json);
        setName(g?.full_name ?? '');
        setEmail(g?.email ?? '');
        setPhone(g?.phone ?? '');
      }
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
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
      setName(g?.full_name ?? name);
      setEmail(g?.email ?? email);
      setMessage('تم حفظ التعديلات');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>;

  return (
    <div className="mx-auto max-w-[480px] space-y-5">
      <div>
        <h2 className="text-[22px] font-extrabold">حسابي</h2>
        <p className="text-[13px] text-[#8a8478]">تحديث الاسم والبريد (اختياري)</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-[#ece6d8] bg-white p-5">
        <div>
          <label className={accountLabel}>رقم الهاتف</label>
          <input className={accountField} value={phone} disabled dir="ltr" />
        </div>
        <div>
          <label className={accountLabel}>الاسم</label>
          <input className={accountField} required value={name} onChange={(e) => setName(e.target.value)} />
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
          className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3 text-[15px] font-extrabold text-navy"
        >
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </div>
  );
}
