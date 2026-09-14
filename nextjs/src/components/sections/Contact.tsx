'use client';
import { useEffect, useState } from 'react';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import SectionHeading from '../ui/SectionHeading';
import PageShell from '../ui/PageShell';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import KuwaitPhoneField, { localKuwaitDigits } from '../ui/KuwaitPhoneField';
import { unwrapList } from '@/lib/account';

const field =
  'w-full rounded-xl border border-gold/25 bg-white/[.06] px-4 py-3.5 text-[14px] text-white placeholder:text-muted-dim focus:border-gold focus:outline-none';

type ContactContent = {
  page_eyebrow: string;
  page_title: string;
  page_description: string;
  phones: string[];
  days: string;
  hours: string;
  form_labels: Record<string, string>;
  success_title: string;
  success_message: string;
  success_cta: string;
};

type StageOption = { id: number; name: string };

export default function Contact() {
  const c = useSection<ContactContent>(useMarketing(), 'contact');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stages, setStages] = useState<StageOption[]>([]);
  const [phone, setPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/public/stages');
        if (res.ok) setStages(unwrapList<StageOption>(await res.json()));
      } catch {
        /* keep empty */
      }
    })();
  }, []);

  if (!c) return null;
  const labels = c.form_labels ?? {};

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const whatsapp = localKuwaitDigits(phone);
    const second = localKuwaitDigits(phoneSecondary);
    const stageId = String(data.get('stage') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    if (!name || whatsapp.length !== 8) {
      setError('يرجى إدخال الاسم ورقم واتساب صحيح (8 أرقام).');
      return form.reportValidity();
    }
    if (second && second.length !== 8) {
      setError('الرقم الثاني يجب أن يكون 8 أرقام بعد +965.');
      return;
    }
    if (second && second === whatsapp) {
      setError('الرقم الثاني يجب أن يختلف عن رقم الواتساب.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/public/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: whatsapp,
          phone_secondary: second || null,
          educational_stage_id: stageId ? Number(stageId) : null,
          message: message || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; errors?: Record<string, string[]> }
          | null;
        const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : null;
        setError(firstError || body?.message || 'تعذر إرسال الرسالة. حاول مرة أخرى.');
        return;
      }
      setSent(true);
      form.reset();
      setPhone('');
      setPhoneSecondary('');
    } catch {
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="flex flex-wrap content-center items-start gap-8 lg:gap-10">
        <div className="min-w-[280px] flex-1 basis-[380px]">
          <SectionHeading eyebrow={c.page_eyebrow} title={c.page_title} />
          <p className="mt-5 text-[15px] leading-[1.9] text-muted">{c.page_description}</p>

          <div className="mt-6 space-y-2.5">
            {(c.phones ?? []).map((p) => (
              <a
                key={p}
                href={`tel:${p}`}
                className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-white/[.04] p-4 transition-colors hover:border-gold/45 hover:bg-white/[.06]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                  <Icon name="fa-solid fa-phone" />
                </span>
                <div>
                  <div className="text-[11px] text-muted-dim">اتصل بنا</div>
                  <span className="font-latin text-[19px] font-bold text-gold-soft">{p}</span>
                </div>
              </a>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                <Icon name="fa-solid fa-clock" />
              </span>
              <div>
                <div className="text-[11px] text-muted-dim">أوقات الدوام</div>
                <span className="text-[14px] text-muted">
                  {c.days} · <span className="font-latin">{c.hours}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-[280px] flex-1 basis-[420px]">
          {sent ? (
            <div className="rounded-[22px] border border-gold/40 bg-gradient-to-br from-white/[.08] to-white/[.02] p-8 text-center shadow-[0_24px_50px_-30px_rgba(0,0,0,.8)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/[.15]">
                <Icon name="fa-solid fa-circle-check" className="text-[32px] text-gold" />
              </div>
              <h3 className="mt-5 text-[22px] font-extrabold">{c.success_title}</h3>
              <p className="mt-2 text-[14px] text-muted">{c.success_message}</p>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setSent(false)}>
                {c.success_cta}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="space-y-3.5 rounded-[22px] border border-gold/25 bg-white/[.04] p-6 shadow-[0_24px_50px_-34px_rgba(0,0,0,.75)] sm:p-7"
            >
              <div className="mb-1 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                  <Icon name="fa-solid fa-envelope" />
                </span>
                <span className="text-[14px] font-bold text-[#f0e6cf]">أرسل رسالة</span>
              </div>
              <div>
                <label htmlFor="c-name" className="mb-1.5 block text-[13px] text-muted">{labels.name}</label>
                <input id="c-name" name="name" required placeholder={labels.name_placeholder} className={field} />
              </div>
              <div>
                <label htmlFor="c-phone" className="mb-1.5 block text-[13px] text-muted">
                  {labels.phone || 'رقم الواتساب'}
                </label>
                <KuwaitPhoneField id="c-phone" required value={phone} onChange={setPhone} />
              </div>
              <div>
                <label htmlFor="c-phone-2" className="mb-1.5 block text-[13px] text-muted">
                  {labels.phone_secondary || 'رقم تواصل ثاني (اختياري)'}
                </label>
                <KuwaitPhoneField id="c-phone-2" value={phoneSecondary} onChange={setPhoneSecondary} />
              </div>
              <div>
                <label htmlFor="c-stage" className="mb-1.5 block text-[13px] text-muted">{labels.stage}</label>
                <select id="c-stage" name="stage" className={field}>
                  <option value="">{labels.stage_placeholder}</option>
                  {stages.map((s) => (
                    <option key={s.id} value={String(s.id)} className="text-navy">{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="c-msg" className="mb-1.5 block text-[13px] text-muted">{labels.message}</label>
                <textarea id="c-msg" name="message" rows={4} placeholder={labels.message_placeholder} className={`${field} resize-y leading-[1.7]`} />
              </div>
              {error ? <p className="text-[13px] text-[#ffb4b4]">{error}</p> : null}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? labels.submitting : labels.submit}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
