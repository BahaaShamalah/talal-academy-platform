'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import {
  type PrivateLessonOffer,
  type Student,
  unwrapList,
} from '@/lib/account';
import { studentGradeLabel } from '@/lib/portal';
import { formatTimeRange12h } from '@/lib/time';
import { cn } from '@/lib/cn';

type Period = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

function periodLabel(p: Period): string {
  const start = String(p.start_time).slice(0, 5);
  const end = String(p.end_time).slice(0, 5);
  return `${p.name_ar} · ${formatTimeRange12h(start, end)}`;
}

function BookPageInner({
  listHref,
  bookHref,
  student,
}: {
  listHref: string;
  bookHref: string;
  student: Student | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const urlOfferId = search.get('offer_id');
  const urlPeriodId = search.get('period_id');

  const [step, setStep] = useState<'pick' | 'confirm'>(urlOfferId && urlPeriodId ? 'confirm' : 'pick');
  const [offers, setOffers] = useState<PrivateLessonOffer[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<PrivateLessonOffer | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const gradeId = student?.current_grade_id ?? student?.current_grade?.id ?? null;
  const gradeLabel = studentGradeLabel(student);

  const confirmOffer = useMemo(() => {
    if (selectedOffer) return selectedOffer;
    if (urlOfferId) return offers.find((o) => String(o.id) === urlOfferId) ?? null;
    return null;
  }, [selectedOffer, urlOfferId, offers]);

  const confirmPeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    if (urlPeriodId) return periods.find((p) => p.id === urlPeriodId) ?? null;
    return null;
  }, [selectedPeriod, urlPeriodId, periods]);

  const loadOffers = useCallback(async () => {
    if (!gradeId) {
      setOffers([]);
      return;
    }
    setOffersLoading(true);
    try {
      const res = await fetch(`/api/public/private-lesson-offers?grade_id=${gradeId}`);
      if (res.ok) setOffers(unwrapList<PrivateLessonOffer>(await res.json()));
      else setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [gradeId]);

  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      const res = await fetch('/api/public/private-lesson-periods');
      if (res.ok) setPeriods(unwrapList<Period>(await res.json()));
      else setPeriods([]);
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
    void loadPeriods();
    setSelectedOffer(null);
    setSelectedPeriod(null);
    setStep(urlOfferId && urlPeriodId ? 'confirm' : 'pick');
    setError('');
  }, [loadOffers, loadPeriods, student?.id, urlOfferId, urlPeriodId]);

  useEffect(() => {
    if (!urlOfferId || offers.length === 0) return;
    setSelectedOffer(offers.find((o) => String(o.id) === urlOfferId) ?? null);
  }, [urlOfferId, offers]);

  useEffect(() => {
    if (!urlPeriodId || periods.length === 0) return;
    setSelectedPeriod(periods.find((p) => p.id === urlPeriodId) ?? null);
  }, [urlPeriodId, periods]);

  function goConfirm(offer: PrivateLessonOffer, period: Period) {
    setSelectedOffer(offer);
    setSelectedPeriod(period);
    setStep('confirm');
    setError('');
    router.replace(`${bookHref}?offer_id=${offer.id}&period_id=${period.id}`, { scroll: false });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student?.id || !confirmOffer || !confirmPeriod) return;
    setSubmitting(true);
    setError('');
    try {
      const body = {
        student_id: student.id,
        private_lesson_offer_id: confirmOffer.id,
        preferred_period_id: confirmPeriod.id,
      };

      const res = await fetch('/api/guardian/private-lesson-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر إتمام الطلب');
        return;
      }

      router.replace(listHref);
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-[1024px] rounded-[18px] border border-cream-line bg-white px-5 py-8 text-center text-[14px] text-ink-dim">
        اختر أحد الأبناء من الأعلى لطلب حصة خاصة.
      </div>
    );
  }

  if (!gradeId) {
    return (
      <div className="mx-auto max-w-[1024px] rounded-[18px] border border-cream-line bg-white px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-navy-800">لم يُحدَّد صف الطالب بعد</p>
        <p className="mt-2 text-[13px] text-ink-dim">تواصل مع الإدارة لاستكمال بيانات الصف ثم أعد المحاولة.</p>
        <Link href={listHref} className="mt-4 inline-block text-[13px] font-bold text-navy-800">
          ← رجوع
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1024px] space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-cream-line bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-[13px] font-bold text-gold-soft">
            {student.full_name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join('') || 'ط'}
          </span>
          <div>
            <p className="text-[14px] font-bold text-navy-800">{student.full_name}</p>
            <p className="text-[12px] text-ink-dim">{gradeLabel || '—'}</p>
          </div>
        </div>
        <Link href={listHref} className="text-[12.5px] font-semibold text-ink-dim hover:text-navy-800">
          ← الحجوزات
        </Link>
      </div>

      {step === 'pick' ? (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="border-b border-[#f0ece1] px-[18px] py-3.5">
              <h3 className="text-[14.5px] font-bold text-navy-800">1) اختر المادة</h3>
              <p className="mt-0.5 text-[12px] text-ink-dim">عروض الإدارة لصف الطالب</p>
            </div>

            {offersLoading ? (
              <p className="px-[18px] py-8 text-[13px] text-ink-dim">جاري التحميل…</p>
            ) : offers.length === 0 ? (
              <p className="px-[18px] py-8 text-[13px] text-ink-dim">
                لا توجد مواد متاحة لهذا الصف. راجع الإدارة.
              </p>
            ) : (
              <div className="divide-y divide-[#f4f1ea]">
                {offers.map((offer) => {
                  const active = selectedOffer?.id === offer.id;
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => {
                        setSelectedOffer(offer);
                        setError('');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3.5 px-[18px] py-4 text-right transition-colors',
                        active ? 'bg-gold/[.1]' : 'hover:bg-[#faf8f3]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-[14px]',
                          active ? 'bg-gold/25 text-gold-deep' : 'bg-gold/[.14] text-gold-deep',
                        )}
                      >
                        <Icon name="fa-solid fa-book" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-ink">
                          {offer.subject?.name ?? 'حصة خاصة'}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-dim">
                          {[
                            offer.teacher?.name,
                            offer.session_type === 'individual' ? 'فردي' : 'جماعي',
                            `${offer.duration_minutes} د`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="font-latin text-[16px] font-bold text-navy-800">{offer.price}</p>
                        <p className="text-[11px] text-ink-dim">د.ك</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
            <div className="border-b border-[#f0ece1] px-[18px] py-3.5">
              <h3 className="text-[14.5px] font-bold text-navy-800">2) اختر الفترة</h3>
              <p className="mt-0.5 text-[12px] text-ink-dim">مواعيد ثابتة من إعدادات المعهد</p>
            </div>

            {!selectedOffer ? (
              <p className="px-[18px] py-8 text-[13px] text-ink-dim">اختر مادة أولاً لعرض الفترات.</p>
            ) : periodsLoading ? (
              <p className="px-[18px] py-8 text-[13px] text-ink-dim">جاري تحميل الفترات…</p>
            ) : periods.length === 0 ? (
              <p className="px-[18px] py-8 text-[13px] text-ink-dim">
                لم تُضبط فترات بعد في إعدادات المعهد.
              </p>
            ) : (
              <ul className="divide-y divide-[#f4f1ea]">
                {periods.map((period) => (
                  <li
                    key={period.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf0f8] text-[#1c4b8f]">
                        <Icon name="fa-regular fa-clock" className="text-[13px]" />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-bold text-ink">{period.name_ar}</p>
                        <p className="font-latin text-[12px] text-ink-dim" dir="ltr">
                          {formatTimeRange12h(
                            String(period.start_time).slice(0, 5),
                            String(period.end_time).slice(0, 5),
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => goConfirm(selectedOffer, period)}
                      className="rounded-full bg-navy-800 px-4 py-2 text-[12.5px] font-bold text-gold-soft"
                    >
                      اختيار
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : confirmOffer && confirmPeriod ? (
        <form
          onSubmit={onSubmit}
          className="overflow-hidden rounded-[18px] border border-cream-line bg-white"
        >
          <div className="border-b border-[#f0ece1] px-[18px] py-3.5">
            <button
              type="button"
              onClick={() => {
                setStep('pick');
                setError('');
                router.replace(bookHref, { scroll: false });
              }}
              className="mb-2 text-[12.5px] font-bold text-navy-800"
            >
              ← تغيير المادة أو الفترة
            </button>
            <h3 className="text-[14.5px] font-bold text-navy-800">تأكيد الطلب</h3>
          </div>

          <dl className="grid gap-3 px-[18px] py-4 text-[13.5px] sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-[#f4f1ea] pb-3">
              <dt className="text-ink-dim">الطالب</dt>
              <dd className="font-bold text-ink">{student.full_name}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#f4f1ea] pb-3">
              <dt className="text-ink-dim">الصف</dt>
              <dd className="font-bold text-ink">{gradeLabel}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#f4f1ea] pb-3">
              <dt className="text-ink-dim">المادة</dt>
              <dd className="font-bold text-ink">{confirmOffer.subject?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#f4f1ea] pb-3">
              <dt className="text-ink-dim">المعلم</dt>
              <dd className="font-bold text-ink">{confirmOffer.teacher?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#f4f1ea] pb-3 sm:col-span-2">
              <dt className="text-ink-dim">الفترة</dt>
              <dd className="font-bold text-ink">{periodLabel(confirmPeriod)}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:col-span-2">
              <dt className="text-ink-dim">السعر</dt>
              <dd className="font-latin text-[18px] font-bold text-navy-800">
                {confirmOffer.price} د.ك
              </dd>
            </div>
          </dl>

          <p className="px-[18px] pb-2 text-[12.5px] text-ink-dim">
            سيتم تنسيق اليوم والتأكيد من الإدارة حسب الفترة المختارة.
          </p>

          {error ? <p className="px-[18px] pb-2 text-[13px] text-[#a34b4b]">{error}</p> : null}

          <div className="border-t border-[#f0ece1] px-[18px] py-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3 text-[15px] font-extrabold text-navy disabled:opacity-50 sm:max-w-xs"
            >
              {submitting ? 'جاري الإرسال…' : 'تأكيد طلب الحصة'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default function PrivateLessonBookForm({
  listHref = '/portal/private-lessons',
  bookHref = '/portal/private-lessons/book',
  student = null,
}: {
  listHref?: string;
  bookHref?: string;
  student?: Student | null;
}) {
  return (
    <Suspense fallback={<p className="py-8 text-center text-[14px] text-ink-dim">جاري التحميل…</p>}>
      <BookPageInner listHref={listHref} bookHref={bookHref} student={student} />
    </Suspense>
  );
}
