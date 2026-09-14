'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnboardingAside from '@/components/onboarding/OnboardingAside';
import Icon from '@/components/ui/Icon';
import KuwaitPhoneInput from '@/components/ui/KuwaitPhoneInput';
import { mascotLines as fallbackLines, payMethods, STAGE_ICONS, stepLabels as fallbackSteps } from '@/data/enrollment';
import {
  formatKwd,
  planCompareAt,
  previewInstallments,
  type Plan,
  type SubjectOption,
  unwrapList,
  unwrapOne,
  apiErrorMessage,
} from '@/lib/account';
import { cn } from '@/lib/cn';
import { isValidKuwaitMobile, normalizeKuwaitPhone } from '@/lib/kuwait-phone';
import type { PayMethod } from '@/types/portal';

type Stage = { id: number; name: string; order?: number; grades_count?: number };
type Grade = { id: number; name: string; educational_stage_id: number; order?: number };
type AuthPhase = 'phone' | 'otp' | 'profile' | 'done';
type PayChoice = PayMethod['id'];

type RegConfig = {
  guide_name: string;
  guide_role: string;
  aside_image: string | null;
  mascot_lines: string[];
  step_labels: string[];
};

const field = 'w-full rounded-[13px] border border-cream-line2 bg-white px-4 py-3.5 text-[14px] text-ink focus:border-gold focus:outline-none';
const label = 'mb-1.5 block text-[12.5px] font-semibold text-ink-soft';
const card = 'cursor-pointer bg-white transition-all duration-200';

const RELATIONS = [
  { value: 'أب', label: 'الأب' },
  { value: 'أم', label: 'الأم' },
  { value: 'ولي أمر آخر', label: 'ولي أمر آخر' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<RegConfig>({
    guide_name: 'سارة',
    guide_role: 'مرشدة التسجيل',
    aside_image: null,
    mascot_lines: fallbackLines,
    step_labels: fallbackSteps,
  });

  const [stages, setStages] = useState<Stage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<SubjectOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [stageId, setStageId] = useState<number | null>(null);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const preferredPlanIdRef = useRef<number | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [pay, setPay] = useState<PayChoice>('full');

  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentRelation, setParentRelation] = useState('أب');
  const [authPhase, setAuthPhase] = useState<AuthPhase>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentGender, setStudentGender] = useState<'male' | 'female'>('male');
  const [studentNote, setStudentNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    studentId: number;
    fileNumber?: string;
    invoiceNumber?: string;
    payMode: PayChoice;
  } | null>(null);

  const stepLabels = config.step_labels.length >= 7 ? config.step_labels : fallbackSteps;
  const TOTAL = stepLabels.length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stage = Number(params.get('stage_id'));
    const grade = Number(params.get('grade_id'));
    const plan = Number(params.get('plan_id'));
    if (Number.isFinite(stage) && stage > 0) {
      setStageId(stage);
      if (Number.isFinite(grade) && grade > 0) {
        setGradeId(grade);
        if (Number.isFinite(plan) && plan > 0) {
          preferredPlanIdRef.current = plan;
          setStep(3);
        } else {
          setStep(2);
        }
      } else {
        setStep(1);
      }
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 8000);

    void (async () => {
      try {
        const stagesRes = await fetch('/api/public/stages', { signal: ctrl.signal });
        if (stagesRes.ok) setStages(unwrapList<Stage>(await stagesRes.json()));
      } catch {
        // timeout / network — نعرض الصفحة بدل انتظار لا نهائي
      } finally {
        window.clearTimeout(timer);
        setLoadingCatalog(false);
      }

      try {
        const [meRes, marketingRes] = await Promise.all([
          fetch('/api/guardian/me', { signal: AbortSignal.timeout(8000) }),
          fetch('/api/public/marketing-sections', { signal: AbortSignal.timeout(8000) }),
        ]);
        if (meRes.ok) {
          const me = unwrapOne<{ full_name?: string | null; phone?: string; email?: string | null; relationship?: string | null }>(
            await meRes.json(),
          );
          setAuthed(true);
          setAuthPhase('done');
          if (me?.full_name) setParentName(me.full_name);
          if (me?.phone) setParentPhone(normalizeKuwaitPhone(me.phone) || me.phone);
          if (me?.email) setParentEmail(me.email);
          if (me?.relationship) setParentRelation(me.relationship);
        }
        if (marketingRes.ok) {
          const json = await marketingRes.json();
          const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          const row = list.find((s: { section_key?: string }) => s.section_key === 'registration');
          if (row?.content) {
            const c = row.content as Partial<RegConfig>;
            setConfig({
              guide_name: c.guide_name || 'سارة',
              guide_role: c.guide_role || 'مرشدة التسجيل',
              aside_image: typeof c.aside_image === 'string' ? c.aside_image : null,
              mascot_lines: Array.isArray(c.mascot_lines) && c.mascot_lines.length ? c.mascot_lines : fallbackLines,
              step_labels: Array.isArray(c.step_labels) && c.step_labels.length >= 7 ? c.step_labels : fallbackSteps,
            });
          }
        }
      } catch {
        // غير حرج لعرض خطوة اختيار المرحلة
      }
    })();

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  useEffect(() => {
    if (!stageId) {
      setGrades([]);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/public/grades?stage_id=${stageId}`);
      if (res.ok) setGrades(unwrapList<Grade>(await res.json()));
    })();
  }, [stageId]);

  useEffect(() => {
    if (!gradeId) {
      setPlans([]);
      setGradeSubjects([]);
      setPlanId(null);
      setSelectedSubjectIds([]);
      return;
    }
    void (async () => {
      const [plansRes, subjectsRes] = await Promise.all([
        fetch(`/api/public/plans?grade_id=${gradeId}`),
        fetch(`/api/public/grades/${gradeId}/subjects`),
      ]);
      if (plansRes.ok) {
        const list = unwrapList<Plan>(await plansRes.json());
        setPlans(list);
        const preferred = preferredPlanIdRef.current;
        if (preferred != null && list.some((p) => p.id === preferred)) {
          setPlanId(preferred);
          preferredPlanIdRef.current = null;
        } else {
          setPlanId(null);
        }
        setSelectedSubjectIds([]);
      }
      if (subjectsRes.ok) setGradeSubjects(unwrapList<SubjectOption>(await subjectsRes.json()));
      else setGradeSubjects([]);
    })();
  }, [gradeId]);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;
  const isChooseSubjects = selectedPlan?.product_type?.subject_selection_mode === 'choose_subjects';
  const requiredSubjectCount = Number(selectedPlan?.subject_selection_count ?? 0);
  const subjectsReady =
    !isChooseSubjects ||
    (requiredSubjectCount > 0 && selectedSubjectIds.length === requiredSubjectCount);
  const hasInstallment = Boolean(selectedPlan?.installment_template);
  const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const selectedCompareAt = selectedPlan ? planCompareAt(selectedPlan) : null;

  const installmentPreview = useMemo(() => {
    if (!selectedPlan?.installment_template || pay !== 'installments') return [];
    return previewInstallments(planPrice, selectedPlan.installment_template);
  }, [selectedPlan, pay, planPrice]);

  const stageName = stages.find((s) => s.id === stageId)?.name ?? '—';
  const gradeName = grades.find((g) => g.id === gradeId)?.name ?? '—';

  function canProceed(): boolean {
    if (step === 1) return stageId != null;
    if (step === 2) return gradeId != null;
    if (step === 3) return planId != null && subjectsReady;
    if (step === 4) return authed && authPhase === 'done' && parentName.trim().length >= 2;
    if (step === 5) return studentName.trim().length >= 2;
    if (step === 6) {
      if (pay === 'installments' && !hasInstallment) return false;
      return true;
    }
    return true;
  }

  async function requestOtp() {
    setError('');
    const full = normalizeKuwaitPhone(parentPhone);
    if (!isValidKuwaitMobile(full)) {
      setError('أدخل رقم هاتف كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9)');
      return;
    }
    setParentPhone(full);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: full }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'تعذّر إرسال الرمز');
        return;
      }
      setDebugOtp(typeof data.debug_otp_code === 'string' ? data.debug_otp_code : null);
      setAuthPhase('otp');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizeKuwaitPhone(parentPhone), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'رمز التحقق غير صحيح');
        return;
      }
      setAuthed(true);
      if (data.is_new_guardian || !data.guardian?.full_name) {
        setAuthPhase('profile');
        return;
      }
      if (data.guardian?.full_name) setParentName(data.guardian.full_name);
      setAuthPhase('done');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveParentProfile() {
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        full_name: parentName.trim(),
        relationship: parentRelation,
      };
      if (parentEmail.trim()) body.email = parentEmail.trim();
      const res = await fetch('/api/guardian/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'تعذّر حفظ البيانات');
        return;
      }
      setAuthPhase('done');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayment(invoiceId: number, installments: { id: number; sequence: number }[], studentId: number) {
    sessionStorage.setItem('pay_return_student_id', String(studentId));
    if (pay === 'installments' && installments.length > 0) {
      const first = [...installments].sort((a, b) => a.sequence - b.sequence)[0];
      sessionStorage.setItem('pay_return_installment', '1');
      sessionStorage.setItem('pay_return_invoice_id', String(invoiceId));
      const payRes = await fetch(`/api/guardian/invoices/${invoiceId}/installments/${first.id}/pay`, {
        method: 'POST',
      });
      const payJson = await payRes.json();
      if (payRes.ok && payJson.payment_url) {
        window.location.href = payJson.payment_url;
        return true;
      }
      return false;
    }
    if (pay === 'full') {
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
    return false;
  }

  async function finalizeRegistration() {
    if (!gradeId || !planId) return;
    setError('');
    setSubmitting(true);
    try {
      const studentRes = await fetch('/api/guardian/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: studentName.trim(),
          gender: studentGender,
          current_grade_id: gradeId,
          notes: studentNote.trim() || undefined,
        }),
      });
      const studentJson = await studentRes.json();
      if (!studentRes.ok) {
        setError(apiErrorMessage(studentJson, 'تعذّر إنشاء ملف الطالب'));
        return;
      }
      const student = unwrapOne<{ id: number; file_number?: string }>(studentJson);
      if (!student?.id) {
        setError('تعذّر قراءة بيانات الطالب');
        return;
      }

      const paymentMode = pay === 'installments' && hasInstallment ? 'installment' : 'full';
      const subBody: Record<string, unknown> = {
        plan_id: planId,
        payment_mode: paymentMode,
      };
      if (isChooseSubjects) subBody.selected_subject_ids = selectedSubjectIds;

      const subRes = await fetch(`/api/guardian/students/${student.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subBody),
      });
      const subJson = await subRes.json();
      if (!subRes.ok) {
        setError(apiErrorMessage(subJson, 'تعذّر إنشاء الاشتراك'));
        return;
      }

      const invoiceId = subJson.invoice?.id as number | undefined;
      const invoiceNumber = subJson.invoice?.invoice_number as string | undefined;
      const installments = (subJson.invoice?.installments ?? []) as { id: number; sequence: number }[];

      setResult({
        studentId: student.id,
        fileNumber: student.file_number,
        invoiceNumber,
        payMode: pay,
      });
      setStep(TOTAL);

      if (pay !== 'onsite' && invoiceId) {
        const redirected = await startPayment(invoiceId, installments, student.id);
        if (redirected) return;
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    setError('');
    if (step === TOTAL) {
      router.push('/');
      return;
    }
    if (step === TOTAL - 1) {
      await finalizeRegistration();
      return;
    }
    if (!canProceed()) {
      setError('أكمل الحقول المطلوبة قبل المتابعة');
      return;
    }
    if (step === 4 && authPhase !== 'done') {
      setError('أكمل التحقق من رقم الهاتف أولاً');
      return;
    }
    setStep(step + 1);
  }

  const amountFor = (p: PayMethod) => {
    if (!selectedPlan) return '—';
    if (p.id === 'installments') {
      if (!hasInstallment) return 'غير متاح لهذه الباقة';
      const n = selectedPlan.installment_template?.number_of_installments ?? 3;
      const first = installmentPreview[0]?.amount;
      return first ? `من ${formatKwd(first)} × ${n}` : `${n} دفعات`;
    }
    return `${formatKwd(planPrice)} د.ك`;
  };

  const summary = [
    { k: 'المرحلة', v: stageName },
    { k: 'الصف', v: gradeName },
    { k: 'الباقة', v: selectedPlan?.name ?? '—' },
    { k: 'السعر', v: selectedPlan ? formatKwd(planPrice) : '—' },
  ];

  const successRows = [
    ...summary.slice(0, 3),
    { k: 'طريقة الدفع', v: payMethods.find((p) => p.id === result?.payMode)?.name ?? '—' },
    { k: 'رقم الملف', v: result?.fileNumber ?? '—' },
    { k: 'الفاتورة', v: result?.invoiceNumber ?? '—' },
  ];

  return (
    <div className="onb-wrap flex min-h-screen flex-wrap bg-cream">
      <OnboardingAside
        step={step}
        totalSteps={TOTAL}
        stepLabels={stepLabels}
        mascotLine={config.mascot_lines[step - 1] ?? fallbackLines[step - 1] ?? ''}
        guideName={config.guide_name}
        guideRole={config.guide_role}
        asideImage={config.aside_image}
      />

      <div className="onb-form app-pad flex min-w-[320px] flex-1 basis-[500px] flex-col bg-cream text-ink">
        <div className="onb-formhead sticky top-0 z-[5] border-b border-cream-line bg-[#fffefb] px-[clamp(20px,3vw,42px)] py-[18px]">
          <span className="onb-grab mx-auto -mt-1.5 mb-3.5 hidden h-1 w-11 rounded-full bg-[#e0d8c6]" />
          <div className="flex items-center justify-between gap-3.5">
            <div>
              <div className="font-latin text-[10.5px] tracking-[.22em] text-gold-deep">
                STEP {step} / {TOTAL}
              </div>
              <h1 className="font-display mt-1.5 text-[22px] font-bold text-navy-800">{stepLabels[step - 1]}</h1>
            </div>
            <Link href="/" className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cream-line2 bg-white px-4 py-2.5 text-[12.5px] text-ink-soft">
              <Icon name="fa-solid fa-arrow-left" className="text-[11px]" /> للموقع
            </Link>
          </div>
          <div className="mt-4 flex gap-[5px]">
            {Array.from({ length: TOTAL }, (_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i + 1 <= step ? 'bg-gold' : 'bg-cream-line2')} />
            ))}
          </div>
        </div>

        <div className="flex-1 px-[clamp(20px,3vw,42px)] py-[clamp(24px,3vw,38px)]">
          {loadingCatalog && step === 1 ? (
            <p className="text-[14px] text-ink-dim">جاري تحميل المراحل…</p>
          ) : null}

          {step === 1 && (
            <>
              <p className="mb-[18px] text-[14px] leading-[1.85] text-ink-soft">اختر المرحلة الدراسية لابنك (من إعدادات الأدمن).</p>
              {stages.length === 0 && !loadingCatalog ? (
                <p className="rounded-[14px] border border-cream-line bg-white px-4 py-5 text-[13.5px] text-ink-dim">
                  لا توجد مراحل مفعّلة. أضفها من الأدمن ← المراحل الدراسية.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                  {stages.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStageId(s.id);
                        setGradeId(null);
                        setPlanId(null);
                      }}
                      className={cn(
                        card,
                        'rounded-[18px] border-2 px-4 py-6 text-center',
                        stageId === s.id
                          ? 'border-gold shadow-[0_14px_30px_-18px_rgba(200,162,74,.95)]'
                          : 'border-cream-line shadow-[0_6px_16px_-14px_rgba(11,35,74,.4)]',
                      )}
                    >
                      <div className="text-[26px] text-gold-deep">
                        <Icon name={STAGE_ICONS[idx % STAGE_ICONS.length]} />
                      </div>
                      <div className="font-display mt-3 text-[17px] font-bold text-navy-800">{s.name}</div>
                      <div className="mt-1.5 text-[12px] text-ink-dim">
                        {s.grades_count != null ? `${s.grades_count} صفوف` : '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="mb-[18px] text-[14px] leading-[1.85] text-ink-soft">
                اختر صف ابنك في <b className="text-navy-800">{stageName}</b>.
              </p>
              {grades.length === 0 ? (
                <p className="text-[13.5px] text-ink-dim">لا توجد صفوف لهذه المرحلة في الأدمن.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-2.5">
                  {grades.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGradeId(g.id)}
                      className={cn(
                        card,
                        'rounded-[14px] border-2 px-2.5 py-3.5 text-center',
                        gradeId === g.id
                          ? 'border-gold shadow-[0_12px_24px_-16px_rgba(200,162,74,.95)]'
                          : 'border-cream-line',
                      )}
                    >
                      <div className="text-[11px] text-ink-dim">الصف</div>
                      <div className="mt-1 text-[15px] font-bold text-navy-800">{g.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="mb-[18px] text-[14px] leading-[1.85] text-ink-soft">
                الباقات المتاحة لـ <b className="text-navy-800">{gradeName}</b> من إدارة الخطط في الأدمن.
              </p>
              {plans.length === 0 ? (
                <p className="rounded-[14px] border border-cream-line bg-white px-4 py-5 text-[13.5px] text-ink-dim">
                  لا توجد باقات نشطة لهذا الصف. أضفها من الأدمن ← الخطط والباقات.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {plans.map((p) => {
                    const on = planId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPlanId(p.id);
                          setSelectedSubjectIds([]);
                          if (!p.installment_template && pay === 'installments') setPay('full');
                        }}
                        className={cn(
                          card,
                          'rounded-[16px] border-2 px-[18px] py-4 text-right',
                          on
                            ? 'border-gold shadow-[0_12px_26px_-18px_rgba(200,162,74,.95)]'
                            : 'border-cream-line',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <b className="text-[14.5px] text-navy-800">{p.name}</b>
                            <div className="mt-1 text-[12px] text-ink-dim">
                              {p.product_type?.name_ar ?? 'باقة'}
                              {p.subject?.name ? ` · ${p.subject.name}` : ''}
                            </div>
                          </div>
                          <span className="flex flex-col items-end leading-none">
                            {planCompareAt(p) != null ? (
                              <span className="font-latin mb-1 text-[12.5px] text-ink-faint line-through">
                                {formatKwd(planCompareAt(p)!)}
                              </span>
                            ) : null}
                            <span className="font-latin whitespace-nowrap text-[18px] font-bold text-gold-deep">
                              {formatKwd(p.price)}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {isChooseSubjects && (
                <div className="mt-5">
                  <p className="mb-2.5 text-[13px] font-bold text-navy-800">
                    اختر {requiredSubjectCount} مواد
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
                    {gradeSubjects.map((sb) => {
                      const on = selectedSubjectIds.includes(sb.id);
                      return (
                        <button
                          key={sb.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectIds((prev) => {
                              if (prev.includes(sb.id)) return prev.filter((id) => id !== sb.id);
                              if (requiredSubjectCount > 0 && prev.length >= requiredSubjectCount) return prev;
                              return [...prev, sb.id];
                            });
                          }}
                          className={cn(
                            card,
                            'flex items-center gap-2 rounded-[14px] border-2 px-3 py-3',
                            on ? 'border-gold' : 'border-cream-line',
                          )}
                        >
                          <span className="text-[13.5px] font-bold">{sb.name}</span>
                          <Icon
                            name={on ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}
                            className={cn('ms-auto text-[15px]', on ? 'text-gold-deep' : 'text-[#d8d0c0]')}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPlan && (
                <div className="mt-[18px] flex items-center justify-between gap-3.5 rounded-[15px] border border-cream-line bg-white px-[18px] py-4">
                  <span className="text-[13.5px] text-ink-soft">إجمالي الباقة</span>
                  <span className="flex items-end gap-2.5">
                    {selectedCompareAt != null ? (
                      <span className="font-latin text-[14px] text-ink-faint line-through">
                        {formatKwd(selectedCompareAt)}
                      </span>
                    ) : null}
                    <span className="font-latin text-[22px] font-bold text-gold-deep">
                      {formatKwd(planPrice)}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-[15px]">
              {authPhase === 'done' ? (
                <>
                  <div className="rounded-[15px] border border-[#e9f3ec] bg-[#f4faf6] px-4 py-3.5 text-[13px] text-[#2e7d4f]">
                    <Icon name="fa-solid fa-circle-check" /> تم التحقق من ولي الأمر
                  </div>
                  <div>
                    <label className={label}>اسم ولي الأمر</label>
                    <input className={field} value={parentName} onChange={(e) => setParentName(e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>رقم الهاتف</label>
                    <KuwaitPhoneInput value={parentPhone} disabled />
                  </div>
                  <div>
                    <label className={label}>صلة القرابة</label>
                    <select className={field} value={parentRelation} onChange={(e) => setParentRelation(e.target.value)}>
                      {RELATIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveParentProfile()}
                    disabled={submitting}
                    className="rounded-full border border-cream-line2 bg-white py-3 text-[13.5px] font-semibold text-ink-soft"
                  >
                    تحديث البيانات
                  </button>
                </>
              ) : authPhase === 'phone' ? (
                <>
                  <p className="text-[14px] leading-[1.85] text-ink-soft">أدخل رقم هاتفك وسنرسل رمز تحقق (OTP).</p>
                  <div>
                    <label className={label}>رقم الهاتف</label>
                    <KuwaitPhoneInput value={parentPhone} onChange={setParentPhone} />
                  </div>
                  <button
                    type="button"
                    disabled={submitting || !isValidKuwaitMobile(parentPhone)}
                    onClick={() => void requestOtp()}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[15px] font-extrabold text-navy shadow-gold disabled:opacity-50"
                  >
                    إرسال رمز التحقق
                  </button>
                </>
              ) : authPhase === 'otp' ? (
                <>
                  <p className="text-[14px] text-ink-soft">
                    أدخل الرمز المرسل إلى{' '}
                    <span className="font-latin font-bold" dir="ltr">
                      {normalizeKuwaitPhone(parentPhone) || parentPhone}
                    </span>
                  </p>
                  {debugOtp ? (
                    <p className="rounded-[12px] bg-[#fff8e8] px-3 py-2 text-[12.5px] text-gold-deep">
                      رمز التجربة: <b className="font-latin">{debugOtp}</b>
                    </p>
                  ) : null}
                  <div>
                    <label className={label}>رمز التحقق</label>
                    <input
                      dir="ltr"
                      className={`${field} font-latin text-center tracking-[.3em]`}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={submitting || otpCode.trim().length < 4}
                    onClick={() => void verifyOtp()}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[15px] font-extrabold text-navy shadow-gold disabled:opacity-50"
                  >
                    تأكيد الرمز
                  </button>
                  <button type="button" className="text-[12.5px] text-ink-dim" onClick={() => setAuthPhase('phone')}>
                    تغيير الرقم
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[14px] text-ink-soft">أكمل بياناتك لأول مرة.</p>
                  <div>
                    <label className={label}>اسم ولي الأمر</label>
                    <input className={field} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="مثال: عبدالله الأحمد" />
                  </div>
                  <div>
                    <label className={label}>البريد الإلكتروني <span className="font-normal text-ink-faint">(اختياري)</span></label>
                    <input dir="ltr" type="email" className={`${field} text-right`} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>صلة القرابة</label>
                    <select className={field} value={parentRelation} onChange={(e) => setParentRelation(e.target.value)}>
                      {RELATIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={submitting || parentName.trim().length < 2}
                    onClick={() => void saveParentProfile()}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[15px] font-extrabold text-navy shadow-gold disabled:opacity-50"
                  >
                    حفظ والمتابعة
                  </button>
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-[15px]">
              <div>
                <label className={label}>اسم الطالب</label>
                <input className={field} placeholder="مثال: محمد عبدالله" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              </div>
              <div>
                <label className={label}>الجنس</label>
                <select className={field} value={studentGender} onChange={(e) => setStudentGender(e.target.value as 'male' | 'female')}>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div>
                <label className={label}>ملاحظات <span className="font-normal text-ink-faint">(اختياري)</span></label>
                <textarea
                  rows={3}
                  className={`${field} resize-y leading-[1.7]`}
                  placeholder="أي معلومة تساعدنا في متابعة ابنك…"
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                />
              </div>
              <div className="rounded-[14px] border border-cream-line bg-white px-4 py-3 text-[12.5px] text-ink-dim">
                الصف المختار: <b className="text-navy-800">{gradeName}</b>
              </div>
            </div>
          )}

          {step === 6 && (
            <>
              <div className="rounded-[18px] border border-cream-line bg-white p-5">
                {summary.map((r) => (
                  <div key={r.k} className="flex justify-between gap-3.5 border-b border-[#f4f1ea] py-2.5 text-[13.5px] last:border-0">
                    <span className="text-ink-dim">{r.k}</span>
                    <b className="text-left">{r.v}</b>
                  </div>
                ))}
                <div className="mt-3 flex items-end justify-between border-t-2 border-navy-800 pt-3">
                  <span className="text-[14.5px] font-bold">الإجمالي</span>
                  <span className="flex items-end gap-2.5">
                    {selectedCompareAt != null ? (
                      <span className="font-latin mb-1 text-[15px] text-ink-faint line-through">
                        {formatKwd(selectedCompareAt)}
                      </span>
                    ) : null}
                    <span className="font-latin text-[32px] font-bold leading-[.9] text-gold-deep">
                      {formatKwd(planPrice)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mb-2.5 mt-[22px] text-[13px] font-bold text-navy-800">طريقة الدفع</div>
              <div className="flex flex-col gap-2.5">
                {payMethods.map((p) => {
                  const disabled = p.id === 'installments' && !hasInstallment;
                  const on = pay === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPay(p.id)}
                      className={cn(
                        card,
                        'flex items-center gap-3.5 rounded-[16px] border-2 px-[18px] py-4 text-right',
                        disabled ? 'cursor-not-allowed opacity-45' : '',
                        on
                          ? 'border-gold shadow-[0_12px_26px_-18px_rgba(200,162,74,.95)]'
                          : 'border-cream-line',
                      )}
                    >
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[15px]', on ? 'bg-gold text-navy' : 'bg-[#f4f1ea] text-gold-deep')}>
                        <Icon name={p.icon} />
                      </span>
                      <span className="flex-1">
                        <b className="text-[14.5px]">{p.name}</b>
                        <span className="mt-1 block text-[12px] leading-[1.6] text-ink-dim">{p.desc}</span>
                      </span>
                      <span className={cn('font-latin whitespace-nowrap text-[14px] font-bold', on ? 'text-gold-deep' : 'text-ink-faint')}>
                        {amountFor(p)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {pay === 'installments' && installmentPreview.length > 0 ? (
                <div className="mt-4 rounded-[14px] border border-cream-line bg-white px-4 py-3 text-[12.5px] text-ink-soft">
                  {installmentPreview.map((row) => (
                    <div key={row.sequence} className="flex justify-between border-b border-[#f4f1ea] py-1.5 last:border-0">
                      <span>دفعة {row.sequence}</span>
                      <b className="font-latin">{formatKwd(row.amount)} د.ك</b>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 rounded-[15px] border border-cream-line bg-white px-[17px] py-4 text-[12.5px] text-ink-dim">
                <Icon name="fa-solid fa-lock" className="text-gold-deep" />{' '}
                {pay === 'onsite'
                  ? 'سيتم إنشاء الفاتورة بدون دفع إلكتروني — سدّد في المعهد.'
                  : 'سيتم تحويلك لبوابة الدفع بعد تأكيد التسجيل.'}
              </div>
            </>
          )}

          {step === 7 && result && (
            <div className="py-2.5 text-center">
              <Icon name="fa-solid fa-circle-check" className="text-[54px] text-gold-deep" />
              <h2 className="font-display mt-[18px] text-[26px] font-bold text-navy-800">تم التسجيل بنجاح</h2>
              <p className="font-latin mt-2 text-[14px] text-ink-dim">
                {result.fileNumber ? `ملف الطالب: ${result.fileNumber}` : `طالب #${result.studentId}`}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 text-right">
                {successRows.map((r) => (
                  <div key={r.k} className="flex justify-between gap-3.5 rounded-[13px] bg-white px-[17px] py-3.5 text-[13.5px]">
                    <span className="text-ink-dim">{r.k}</span>
                    <b className="text-left">{r.v}</b>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[13.5px] leading-[1.9] text-ink-soft">
                {result.payMode === 'onsite'
                  ? 'سجّلنا اشتراكك — راجع المعهد لإتمام الدفع.'
                  : 'إن لم تُحوَّل لبوابة الدفع، يمكنك الدفع من حسابك لاحقًا.'}
              </p>
              <div className="mt-[22px] flex flex-wrap gap-3">
                <Link
                  href={`/portal/children/${result.studentId}`}
                  className="flex flex-1 basis-[170px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-4 text-[15px] font-extrabold text-navy shadow-gold"
                >
                  <Icon name="fa-solid fa-chart-simple" className="text-[13px]" /> ملف الطالب
                </Link>
                <Link
                  href="/portal"
                  className="flex flex-1 basis-[170px] items-center justify-center gap-2.5 rounded-full border border-cream-line2 bg-white px-4 py-4 text-[15px] font-bold text-navy-800"
                >
                  <Icon name="fa-solid fa-gauge-high" className="text-[13px] text-gold-deep" /> لوحة ولي الأمر
                </Link>
              </div>
            </div>
          )}

          {error ? <p className="mt-4 text-[13px] text-[#a34b4b]">{error}</p> : null}
        </div>

        <div className="sticky bottom-0 flex gap-2.5 border-t border-cream-line bg-[#fffefb] px-[clamp(20px,3vw,42px)] py-4">
          {step > 1 && step < TOTAL && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(step - 1);
              }}
              className="rounded-full border border-cream-line2 bg-white px-6 py-3.5 text-[14px] font-semibold text-ink"
            >
              رجوع
            </button>
          )}
          <button
            type="button"
            disabled={submitting || (step < TOTAL && !canProceed() && step !== 4)}
            onClick={() => void next()}
            className={cn(
              'flex-1 rounded-full disabled:opacity-50',
              step === TOTAL
                ? 'border border-cream-line2 bg-white py-3.5 text-[14.5px] font-semibold text-ink-soft'
                : 'bg-gradient-to-br from-gold-soft to-gold py-4 text-[16px] font-extrabold text-navy shadow-gold',
            )}
          >
            {submitting
              ? 'جاري التنفيذ…'
              : step === TOTAL - 1
                ? 'تأكيد التسجيل'
                : step === TOTAL
                  ? 'العودة إلى الموقع'
                  : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  );
}
