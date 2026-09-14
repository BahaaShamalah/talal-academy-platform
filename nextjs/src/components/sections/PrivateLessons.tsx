'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import PageShell from '../ui/PageShell';
import SectionHeading from '../ui/SectionHeading';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import { type Grade, unwrapList } from '@/lib/account';

const field =
  'w-full rounded-xl border border-gold/25 bg-white/[.06] px-4 py-3.5 text-[14px] text-white placeholder:text-muted-dim focus:border-gold focus:outline-none';

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40];

type FeatureItem = { icon: string; title: string; desc?: string };

type PrivateLessonsContent = {
  section_eyebrow: string;
  section_title: string;
  section_sub: string;
  form_title?: string;
  submit_label?: string;
  submitting_label?: string;
  success_title?: string;
  success_message?: string;
  success_cta?: string;
  student_name_label?: string;
  phone_label?: string;
  phone_secondary_label?: string;
  grade_label?: string;
  subject_label?: string;
  hours_label?: string;
  grade_placeholder?: string;
  subject_placeholder?: string;
  hours_placeholder?: string;
  default_features: FeatureItem[];
};

type SubjectOption = { id: number; name: string };

type Props = {
  initialGradeId?: number | null;
};

export default function PrivateLessons({ initialGradeId = null }: Props) {
  const cms = useSection<PrivateLessonsContent>(useMarketing(), 'private-lessons');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [gradeId, setGradeId] = useState(initialGradeId ? String(initialGradeId) : '');
  const [subjectId, setSubjectId] = useState('');
  const [hours, setHours] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/public/grades');
      if (res.ok) setGrades(unwrapList<Grade>(await res.json()));
    })();
  }, []);

  useEffect(() => {
    if (initialGradeId != null) setGradeId(String(initialGradeId));
  }, [initialGradeId]);

  useEffect(() => {
    setSubjectId('');
    setSubjects([]);
    if (!gradeId) return;
    void (async () => {
      const res = await fetch(`/api/public/grades/${gradeId}/subjects`);
      if (res.ok) setSubjects(unwrapList<SubjectOption>(await res.json()));
    })();
  }, [gradeId]);

  const features = useMemo(
    () => (cms?.default_features ?? []).filter((f) => f.title),
    [cms?.default_features],
  );

  if (!cms) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!studentName.trim() || !phone.trim() || !phoneSecondary.trim() || !gradeId || !subjectId || !hours) {
      setError('يرجى تعبئة كل الحقول المطلوبة.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/public/private-lesson-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName.trim(),
          phone: phone.trim(),
          phone_secondary: phoneSecondary.trim(),
          grade_id: Number(gradeId),
          subject_id: Number(subjectId),
          hours: Number(hours),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; errors?: Record<string, string[]> }
          | null;
        const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : null;
        setError(firstError || body?.message || 'تعذر إرسال الطلب. حاول مرة أخرى.');
        return;
      }
      setSent(true);
      setStudentName('');
      setPhone('');
      setPhoneSecondary('');
      setGradeId('');
      setSubjectId('');
      setHours('');
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
          <SectionHeading
            eyebrow={cms.section_eyebrow}
            title={cms.section_title}
            sub={cms.section_sub}
          />
          {features.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-3 rounded-2xl border border-gold/20 bg-white/[.04] p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                    <Icon name={f.icon || 'fa-solid fa-check'} />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold">{f.title}</p>
                    {f.desc ? <p className="mt-0.5 text-[12.5px] text-muted-dim">{f.desc}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="min-w-[280px] flex-1 basis-[420px]">
          {sent ? (
            <div className="rounded-[22px] border border-gold/40 bg-gradient-to-br from-white/[.08] to-white/[.02] p-8 text-center shadow-[0_24px_50px_-30px_rgba(0,0,0,.8)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/[.15]">
                <Icon name="fa-solid fa-circle-check" className="text-[32px] text-gold" />
              </div>
              <h3 className="mt-5 text-[22px] font-extrabold">
                {cms.success_title || 'تم استلام طلبك'}
              </h3>
              <p className="mt-2 text-[14px] text-muted">
                {cms.success_message || 'سيتواصل معك فريق المعهد قريبًا لتنسيق الحصة الخاصة.'}
              </p>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setSent(false)}>
                {cms.success_cta || 'إرسال طلب آخر'}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="space-y-3.5 rounded-[22px] border border-gold/25 bg-white/[.04] p-6 shadow-[0_24px_50px_-34px_rgba(0,0,0,.75)] sm:p-7"
            >
              <div className="mb-1 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                  <Icon name="fa-solid fa-user-graduate" />
                </span>
                <span className="text-[14px] font-bold text-[#f0e6cf]">
                  {cms.form_title || 'طلب حصة خاصة'}
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-muted">
                  {cms.student_name_label || 'اسم الطالب'}
                </label>
                <input
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: عبدالله الأحمد"
                  className={field}
                />
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] text-muted">
                    {cms.phone_label || 'رقم التواصل'}
                  </label>
                  <input
                    required
                    inputMode="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9XXXXXXX"
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] text-muted">
                    {cms.phone_secondary_label || 'رقم تواصل ثاني'}
                  </label>
                  <input
                    required
                    inputMode="tel"
                    dir="ltr"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value)}
                    placeholder="9XXXXXXX"
                    className={field}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-muted">
                  {cms.grade_label || 'الصف'}
                </label>
                <select
                  required
                  className={field}
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                >
                  <option value="">{cms.grade_placeholder || 'اختر الصف'}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id} className="text-navy">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-muted">
                  {cms.subject_label || 'المادة'}
                </label>
                <select
                  required
                  className={field}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!gradeId}
                >
                  <option value="">
                    {gradeId
                      ? cms.subject_placeholder || 'اختر المادة'
                      : 'اختر الصف أولًا'}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="text-navy">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-muted">
                  {cms.hours_label || 'عدد الساعات المطلوبة'}
                </label>
                <select
                  required
                  className={field}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  <option value="">{cms.hours_placeholder || 'اختر عدد الساعات'}</option>
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h} className="text-navy">
                      {h} {h === 1 ? 'ساعة' : 'ساعات'}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p className="text-[13px] text-[#ffb4b4]">{error}</p> : null}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? cms.submitting_label || 'جارٍ الإرسال…' : cms.submit_label || 'إرسال الطلب'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
