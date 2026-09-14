'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  accountField,
  accountLabel,
  formatKwd,
  planCompareAt,
  previewInstallments,
  type Grade,
  type Plan,
  type Student,
  type SubjectOption,
  unwrapList,
  unwrapOne,
  apiErrorMessage,
} from '@/lib/account';

type PaymentMode = 'full' | 'installment';

export default function SubscribePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [gradeId, setGradeId] = useState('');
  const [planId, setPlanId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full');
  const [coupon, setCoupon] = useState('');
  const [preview, setPreview] = useState<{
    valid?: boolean;
    discount_amount?: number | string | null;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadStudent = useCallback(async () => {
    const res = await fetch(`/api/guardian/students/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || 'تعذّر تحميل الطالب');
      setLoading(false);
      return;
    }
    const s = unwrapOne<Student>(json);
    setStudent(s);
    if (s?.current_grade_id) setGradeId(String(s.current_grade_id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadStudent();
    void (async () => {
      const res = await fetch('/api/public/grades');
      if (res.ok) setGrades(unwrapList<Grade>(await res.json()));
    })();
  }, [loadStudent]);

  useEffect(() => {
    if (!gradeId) {
      setPlans([]);
      setGradeSubjects([]);
      setSelectedSubjectIds([]);
      return;
    }
    void (async () => {
      const [plansRes, subjectsRes] = await Promise.all([
        fetch(`/api/public/plans?grade_id=${gradeId}`),
        fetch(`/api/public/grades/${gradeId}/subjects`),
      ]);
      if (plansRes.ok) {
        setPlans(unwrapList<Plan>(await plansRes.json()));
        setPlanId('');
        setPreview(null);
        setPaymentMode('full');
      }
      if (subjectsRes.ok) {
        setGradeSubjects(unwrapList<SubjectOption>(await subjectsRes.json()));
      } else {
        setGradeSubjects([]);
      }
      setSelectedSubjectIds([]);
    })();
  }, [gradeId]);

  async function onGradeChange(next: string) {
    setGradeId(next);
    setSelectedSubjectIds([]);
    if (next && student && Number(next) !== student.current_grade_id) {
      await fetch(`/api/guardian/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_grade_id: Number(next) }),
      });
    }
  }

  async function validateCoupon() {
    if (!planId || !coupon.trim()) return;
    const res = await fetch('/api/guardian/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon.trim(), plan_id: Number(planId) }),
    });
    setPreview(await res.json());
  }

  const selected = plans.find((p) => String(p.id) === planId);
  const hasInstallmentOption = Boolean(selected?.installment_template);
  const isChooseSubjects =
    selected?.product_type?.subject_selection_mode === 'choose_subjects';
  const requiredSubjectCount = Number(selected?.subject_selection_count ?? 0);
  const subjectsReady =
    !isChooseSubjects ||
    (requiredSubjectCount > 0 && selectedSubjectIds.length === requiredSubjectCount);

  const estimatedTotal = useMemo(() => {
    if (!selected) return 0;
    const base = Number(selected.price);
    const discount =
      preview?.valid && preview.discount_amount != null ? Number(preview.discount_amount) : 0;
    return Math.max(0, base - discount);
  }, [selected, preview]);

  const installmentPreview = useMemo(() => {
    if (!selected?.installment_template || paymentMode !== 'installment') return [];
    return previewInstallments(estimatedTotal, selected.installment_template);
  }, [selected, paymentMode, estimatedTotal]);

  function toggleSubject(subjectId: number) {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      if (requiredSubjectCount > 0 && prev.length >= requiredSubjectCount) {
        return prev;
      }
      return [...prev, subjectId];
    });
  }

  async function startPayment(invoiceId: number, installments: { id: number; sequence: number }[]) {
    sessionStorage.setItem('pay_return_student_id', String(id));

    if (paymentMode === 'installment' && installments.length > 0) {
      const first = [...installments].sort((a, b) => a.sequence - b.sequence)[0];
      sessionStorage.setItem('pay_return_installment', '1');
      sessionStorage.setItem('pay_return_invoice_id', String(invoiceId));
      const payRes = await fetch(
        `/api/guardian/invoices/${invoiceId}/installments/${first.id}/pay`,
        { method: 'POST' },
      );
      const payJson = await payRes.json();
      if (payRes.ok && payJson.payment_url) {
        window.location.href = payJson.payment_url;
        return true;
      }
      return false;
    }

    sessionStorage.removeItem('pay_return_installment');
    sessionStorage.removeItem('pay_return_invoice_id');
    const payRes = await fetch(`/api/guardian/invoices/${invoiceId}/pay`, { method: 'POST' });
    const payJson = await payRes.json();
    if (payRes.ok && payJson.payment_url) {
      window.location.href = payJson.payment_url;
      return true;
    }
    return false;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId || !subjectsReady) return;
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        plan_id: Number(planId),
        payment_mode: hasInstallmentOption ? paymentMode : 'full',
      };
      if (coupon.trim()) body.coupon_code = coupon.trim();
      if (isChooseSubjects) {
        body.selected_subject_ids = selectedSubjectIds;
      }

      const res = await fetch(`/api/guardian/students/${id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(apiErrorMessage(json, 'تعذّر الاشتراك'));
        return;
      }

      const invoiceId = json.invoice?.id as number | undefined;
      const installments = (json.invoice?.installments ?? []) as { id: number; sequence: number }[];

      if (invoiceId) {
        const redirected = await startPayment(invoiceId, installments);
        if (redirected) return;
      }
      router.replace(`/portal/children/${id}`);
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>;
  if (!student) return <p className="text-[14px] text-[#a34b4b]">{error || 'غير موجود'}</p>;

  return (
    <div className="mx-auto max-w-[560px] space-y-5">
      <div>
        <Link href={`/portal/children/${id}`} className="text-[13px] text-[#8a8478]">
          ← {student.full_name}
        </Link>
        <h2 className="mt-2 text-[22px] font-extrabold">اشتراك بباقة</h2>
        <p className="text-[13px] text-[#8a8478]">اختر الباقة المناسبة ثم أكّد للدفع</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#ece6d8] bg-white p-5">
        <div>
          <label className={accountLabel}>الصف</label>
          <select
            className={accountField}
            value={gradeId}
            onChange={(e) => void onGradeChange(e.target.value)}
            required
          >
            <option value="">اختر الصف</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[12px] text-[#8a8478]">مأخوذ من ملف الطالب — يمكن تغييره عند الترقّي</p>
        </div>

        <div className="space-y-2">
          <p className={accountLabel}>الباقات المتاحة</p>
          {plans.length === 0 ? (
            <p className="text-[13px] text-[#8a8478]">لا توجد باقات لهذا الصف.</p>
          ) : (
            plans.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                  planId === String(p.id) ? 'border-gold bg-[#fff8e8]' : 'border-[#ece6d8]'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  className="mt-1"
                  checked={planId === String(p.id)}
                  onChange={() => {
                    setPlanId(String(p.id));
                    setPreview(null);
                    setPaymentMode('full');
                    setSelectedSubjectIds([]);
                  }}
                />
                <span className="flex-1">
                  <span className="block text-[14px] font-extrabold">{p.name}</span>
                  {p.subject?.name ? (
                    <span className="text-[12px] text-[#8a8478]">{p.subject.name}</span>
                  ) : null}
                  {p.product_type?.subject_selection_mode === 'choose_subjects' &&
                  p.subject_selection_count ? (
                    <span className="mt-0.5 block text-[11.5px] text-[#5c4a7a]">
                      اختيار {p.subject_selection_count} مواد
                    </span>
                  ) : null}
                  {p.installment_template ? (
                    <span className="mt-0.5 block text-[11.5px] text-[#1c4b8f]">
                      تقسيط متاح ({p.installment_template.number_of_installments} دفعات)
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-col items-end leading-none">
                  {planCompareAt(p) != null ? (
                    <span className="font-latin mb-1 text-[12px] text-[#8a8478] line-through" dir="ltr">
                      {formatKwd(planCompareAt(p)!)}
                    </span>
                  ) : null}
                  <span className="font-latin text-[14px] font-bold" dir="ltr">
                    {formatKwd(p.price)}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        {isChooseSubjects ? (
          <div className="space-y-2 rounded-xl border border-[#ece6d8] bg-[#faf8f3] p-3">
            <p className={accountLabel}>
              اختر {requiredSubjectCount} مواد بالضبط
              <span className="mr-2 font-normal text-[#8a8478]">
                ({selectedSubjectIds.length}/{requiredSubjectCount})
              </span>
            </p>
            {gradeSubjects.length === 0 ? (
              <p className="text-[13px] text-[#a34b4b]">لا توجد مواد مرتبطة بهذا الصف.</p>
            ) : (
              <div className="space-y-1.5">
                {gradeSubjects.map((subject) => {
                  const checked = selectedSubjectIds.includes(subject.id);
                  const atLimit =
                    !checked &&
                    requiredSubjectCount > 0 &&
                    selectedSubjectIds.length >= requiredSubjectCount;
                  return (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] ${
                        checked
                          ? 'border-gold bg-[#fff8e8]'
                          : atLimit
                            ? 'cursor-not-allowed border-[#ece6d8] opacity-50'
                            : 'cursor-pointer border-[#ece6d8] bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={atLimit}
                        onChange={() => toggleSubject(subject.id)}
                      />
                      <span className="font-bold text-[#1c1a17]">{subject.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedSubjectIds.length > 0 && selectedSubjectIds.length !== requiredSubjectCount ? (
              <p className="text-[12px] text-[#c47a1a]">
                يجب اختيار {requiredSubjectCount} مواد بالضبط
              </p>
            ) : null}
          </div>
        ) : null}

        {hasInstallmentOption && selected?.installment_template ? (
          <div className="space-y-2 rounded-xl border border-[#ece6d8] bg-[#faf8f3] p-3">
            <p className={accountLabel}>طريقة الدفع</p>
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
              <input
                type="radio"
                name="payment_mode"
                checked={paymentMode === 'full'}
                onChange={() => setPaymentMode('full')}
              />
              دفع كامل
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
              <input
                type="radio"
                name="payment_mode"
                checked={paymentMode === 'installment'}
                onChange={() => setPaymentMode('installment')}
              />
              تقسيط على {selected.installment_template.number_of_installments} دفعات
            </label>

            {paymentMode === 'installment' && installmentPreview.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded-lg border border-[#ece6d8] bg-white">
                <table className="w-full min-w-[360px] border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#f8f5ee] text-[#8a8478]">
                      {['الدفعة', 'المبلغ', 'الاستحقاق'].map((h) => (
                        <th key={h} className="px-3 py-2 text-right font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {installmentPreview.map((row) => (
                      <tr key={row.sequence} className="border-t border-[#f4f1ea]">
                        <td className="font-latin px-3 py-2 font-bold" dir="ltr">
                          #{row.sequence}
                        </td>
                        <td className="font-latin px-3 py-2 font-bold text-navy-800" dir="ltr">
                          {formatKwd(row.amount)}
                        </td>
                        <td className="font-latin px-3 py-2 text-[#8a8478]" dir="ltr">
                          {row.dueDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[11px] text-[#8a8478]">
                  معاينة تقريبية — المبالغ والتواريخ النهائية تُحدَّد عند تأكيد الاشتراك.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className={accountLabel}>كود خصم (اختياري)</label>
          <div className="flex gap-2">
            <input
              className={accountField}
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="CODE"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => void validateCoupon()}
              disabled={!planId || !coupon.trim()}
              className="shrink-0 rounded-xl border border-[#ece6d8] px-3 text-[13px] font-bold"
            >
              معاينة
            </button>
          </div>
          {preview ? (
            <p className={`mt-1 text-[12px] ${preview.valid ? 'text-[#2e7d4f]' : 'text-[#a34b4b]'}`}>
              {preview.message}
              {preview.valid && preview.discount_amount != null
                ? ` · خصم ${preview.discount_amount} د.ك`
                : ''}
            </p>
          ) : null}
        </div>

        {selected ? (
          <p className="rounded-xl bg-[#f8f5ee] px-3 py-2 text-[13px]">
            الإجمالي التقريبي:{' '}
            {planCompareAt(selected) != null ? (
              <span className="font-latin ml-1 text-[#8a8478] line-through" dir="ltr">
                {formatKwd(planCompareAt(selected)!)}
              </span>
            ) : null}{' '}
            <strong className="font-latin" dir="ltr">
              {formatKwd(estimatedTotal)}
            </strong>
            {paymentMode === 'installment' && installmentPreview[0] ? (
              <span className="mt-1 block text-[12px] text-[#8a8478]">
                الدفعة الأولى عند التأكيد: {formatKwd(installmentPreview[0].amount)}
              </span>
            ) : null}
          </p>
        ) : null}

        {error ? <p className="text-[13px] text-[#a34b4b]">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || !planId || !subjectsReady}
          className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3 text-[15px] font-extrabold text-navy disabled:opacity-50"
        >
          {submitting
            ? 'جاري التأكيد…'
            : paymentMode === 'installment'
              ? 'تأكيد ودفع الدفعة الأولى'
              : 'تأكيد ودفع'}
        </button>
      </form>
    </div>
  );
}
