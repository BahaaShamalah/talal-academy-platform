'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMarketing } from '../MarketingProvider';
import { useSection } from '@/lib/marketing';
import SectionHeading from '../ui/SectionHeading';
import PageShell from '../ui/PageShell';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ImageFrame from '../ui/ImageFrame';
import { planCompareAt, unwrapList, type Plan } from '@/lib/account';

type FeatureItem = { icon: string; title: string; desc?: string };
type StageCard = {
  stage_id?: number | string | null;
  image?: string | null;
  badge?: string | null;
  short_desc?: string | null;
};

type ProgramsContent = {
  section_eyebrow: string;
  section_title: string;
  section_sub: string;
  explore_cta: string;
  grades_cta: string;
  program_cta: string;
  vip_cta: string;
  currency: string;
  package_label: string;
  single_subjects_label: string;
  features_title: string;
  packages_title: string;
  back_label: string;
  grades_heading: string;
  grade_heading: string;
  empty_package: string;
  empty_subjects: string;
  empty_grades: string;
  loading_label: string;
  error_label: string;
  features: FeatureItem[];
  stage_cards: StageCard[];
};

type Stage = { id: number; name: string; order?: number; grades_count?: number };
type Grade = { id: number; name: string; educational_stage_id: number; order?: number };

type Screen =
  | { kind: 'stages' }
  | { kind: 'grades'; stageId: number }
  | { kind: 'grade'; stageId: number; gradeId: number };

function planMode(plan: Plan): string {
  return plan.product_type?.subject_selection_mode ?? '';
}

function planCoversGrade(plan: Plan, grade: Grade): boolean {
  if (plan.grade_id != null && Number(plan.grade_id) === grade.id) return true;
  if (plan.educational_stage_id != null && Number(plan.educational_stage_id) === grade.educational_stage_id) {
    return true;
  }
  if (plan.grade_id == null && plan.educational_stage_id == null) return true;
  return false;
}

function PriceLine({ plan, currency }: { plan: Plan; currency: string }) {
  const compare = planCompareAt(plan);
  const priceNum = Number(plan.price);
  const priceLabel = Number.isFinite(priceNum) ? priceNum.toFixed(priceNum % 1 === 0 ? 0 : 3) : String(plan.price);

  return (
    <div className="flex items-baseline gap-2">
      {compare != null ? (
        <span className="font-latin text-[13px] text-muted-dim line-through">
          {compare.toFixed(compare % 1 === 0 ? 0 : 3)}
        </span>
      ) : null}
      <span className="font-latin text-[28px] font-bold leading-none text-gold">{priceLabel}</span>
      <span className="text-[12px] text-muted">{currency}</span>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/[.03] px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-gold/45 hover:text-gold-soft"
    >
      <Icon name="fa-solid fa-arrow-right" className="text-[12px]" />
      {label}
    </button>
  );
}

export default function Programs({
  onRegister,
  onVip,
}: {
  onRegister: (ctx: { stageId: number; gradeId?: number; planId?: number }) => void;
  onVip: (ctx?: { stageId?: number; gradeId?: number }) => void;
}) {
  const p = useSection<ProgramsContent>(useMarketing(), 'programs');
  const [stages, setStages] = useState<Stage[]>([]);
  const [gradesByStage, setGradesByStage] = useState<Record<number, Grade[]>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<Screen>({ kind: 'stages' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stagesRes, plansRes] = await Promise.all([
        fetch('/api/public/stages'),
        fetch('/api/public/plans'),
      ]);
      if (!stagesRes.ok || !plansRes.ok) throw new Error('catalog');

      const stageList = unwrapList<Stage>(await stagesRes.json());
      setStages(stageList);
      setPlans(unwrapList<Plan>(await plansRes.json()));

      const gradeEntries = await Promise.all(
        stageList.map(async (stage) => {
          const res = await fetch(`/api/public/grades?stage_id=${stage.id}`);
          if (!res.ok) return [stage.id, [] as Grade[]] as const;
          return [stage.id, unwrapList<Grade>(await res.json())] as const;
        }),
      );
      setGradesByStage(Object.fromEntries(gradeEntries));
    } catch {
      setError(p?.error_label || 'تعذّر تحميل البرامج');
    } finally {
      setLoading(false);
    }
  }, [p?.error_label]);

  useEffect(() => {
    void load();
  }, [load]);

  const stageCards = p?.stage_cards ?? [];

  const cardForStage = useCallback(
    (stage: Stage, index: number): StageCard => {
      const byId = stageCards.find((c) => Number(c.stage_id) === stage.id);
      if (byId) return byId;
      return stageCards[index] ?? {};
    },
    [stageCards],
  );

  const activeStage = useMemo(
    () => (screen.kind === 'stages' ? null : stages.find((s) => s.id === screen.stageId) ?? null),
    [screen, stages],
  );

  const activeGrade = useMemo(() => {
    if (screen.kind !== 'grade') return null;
    return (gradesByStage[screen.stageId] ?? []).find((g) => g.id === screen.gradeId) ?? null;
  }, [screen, gradesByStage]);

  const gradePlans = useMemo(() => {
    if (!activeGrade) return [] as Plan[];
    return plans.filter((pl) => planCoversGrade(pl, activeGrade));
  }, [activeGrade, plans]);

  const packages = useMemo(
    () => gradePlans.filter((pl) => planMode(pl) === 'all_subjects'),
    [gradePlans],
  );
  const singles = useMemo(
    () =>
      gradePlans
        .filter((pl) => planMode(pl) === 'single_subject')
        .slice()
        .sort((a, b) => (a.subject?.name || a.name).localeCompare(b.subject?.name || b.name, 'ar')),
    [gradePlans],
  );

  if (!p) return null;

  const exploreCta = p.explore_cta || 'استكشف الباقات والميزات';
  const gradesCta = p.grades_cta || 'عرض الصف';
  const backLabel = p.back_label || 'رجوع';
  const features = p.features ?? [];

  return (
    <PageShell>
      {screen.kind === 'stages' ? (
        <SectionHeading eyebrow={p.section_eyebrow} title={p.section_title} sub={p.section_sub} />
      ) : null}

      {screen.kind === 'grades' && activeStage ? (
        <div className="space-y-3">
          <BackButton label={backLabel} onClick={() => setScreen({ kind: 'stages' })} />
          <SectionHeading
            eyebrow={p.section_eyebrow}
            title={activeStage.name}
            sub={p.grades_heading || 'اختر الصف لاستعراض الميزات والباقات'}
          />
        </div>
      ) : null}

      {screen.kind === 'grade' && activeStage && activeGrade ? (
        <div className="space-y-3">
          <BackButton
            label={backLabel}
            onClick={() => setScreen({ kind: 'grades', stageId: activeStage.id })}
          />
          <SectionHeading
            eyebrow={activeStage.name}
            title={activeGrade.name}
            sub={p.grade_heading || 'الميزات والباقات وأسعار المواد'}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[18px] border border-gold/20 bg-white/[.03] px-5 py-8 text-center text-[14px] text-muted">
          {p.loading_label || 'جارٍ تحميل البرامج…'}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-[18px] border border-red-400/30 bg-red-950/20 px-5 py-6 text-center">
          <p className="text-[14px] text-red-200">{error}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => void load()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {!loading && !error && screen.kind === 'stages' ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {stages.map((stage, idx) => {
            const card = cardForStage(stage, idx);
            const grades = gradesByStage[stage.id] ?? [];
            const desc =
              card.short_desc ||
              (grades.length > 0 ? `${grades.length} صفوف دراسية` : p.empty_grades);

            return (
              <article
                key={stage.id}
                className="animate-fadeUp group flex flex-col overflow-hidden rounded-[20px] border border-gold/25 bg-white/[.04] transition-colors hover:border-gold/45"
              >
                <div className="relative overflow-hidden">
                  <ImageFrame
                    src={card.image || undefined}
                    placeholder={`صورة ${stage.name}`}
                    className="h-[150px] w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {card.badge ? (
                    <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-navy shadow-sm">
                      {card.badge}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[19px] font-extrabold">{stage.name}</h3>
                  <p className="mt-1 text-[13px] text-muted-dim">{desc}</p>
                  <Button
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      setScreen({ kind: 'grades', stageId: stage.id });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    {exploreCta}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && screen.kind === 'grades' && activeStage ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          {(gradesByStage[activeStage.id] ?? []).length === 0 ? (
            <p className="text-[14px] text-muted-dim">{p.empty_grades}</p>
          ) : (
            (gradesByStage[activeStage.id] ?? []).map((grade) => (
              <button
                key={grade.id}
                type="button"
                onClick={() => {
                  setScreen({ kind: 'grade', stageId: activeStage.id, gradeId: grade.id });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="rounded-[18px] border border-gold/20 bg-white/[.03] p-5 text-start transition-colors hover:border-gold/45 hover:bg-white/[.06]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                  <Icon name="fa-solid fa-layer-group" />
                </div>
                <h3 className="mt-3 text-[16px] font-bold">{grade.name}</h3>
                <p className="mt-1 text-[12.5px] text-muted-dim">الميزات · الباقات · المواد</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-gold">
                  {gradesCta}
                  <Icon name="fa-solid fa-chevron-left" className="text-[11px]" />
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {!loading && !error && screen.kind === 'grade' && activeStage && activeGrade ? (
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                <Icon name="fa-solid fa-star" />
              </span>
              <h3 className="text-[18px] font-extrabold">{p.features_title || 'المميزات'}</h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-gold/20 bg-white/[.03] p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                    <Icon name={f.icon || 'fa-solid fa-check'} />
                  </span>
                  <div className="mt-2.5 text-[14px] font-bold">{f.title}</div>
                  {f.desc ? <p className="mt-1 text-[12px] text-muted-dim">{f.desc}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/[.14] text-gold">
                <Icon name="fa-solid fa-box-open" />
              </span>
              <h3 className="text-[18px] font-extrabold">{p.packages_title || 'الباقات والأسعار'}</h3>
            </div>

            <div className="mb-3 rounded-[20px] border border-gold/30 bg-gold/[.07] p-5">
              <div className="mb-1 text-[11px] font-bold tracking-wide text-gold-soft">
                {p.package_label || 'الباقة الشاملة'}
              </div>
              {packages[0] ? (
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h4 className="text-[17px] font-extrabold">{packages[0].name}</h4>
                    {packages[0].description ? (
                      <p className="mt-1 text-[13px] text-muted-dim">{packages[0].description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <PriceLine plan={packages[0]} currency={p.currency} />
                    <Button
                      size="sm"
                      onClick={() =>
                        onRegister({
                          stageId: activeStage.id,
                          gradeId: activeGrade.id,
                          planId: packages[0].id,
                        })
                      }
                    >
                      {p.program_cta || 'سجّل الآن'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted-dim">{p.empty_package}</p>
              )}
            </div>

            <div className="rounded-[20px] border border-gold/20 bg-white/[.03] p-4 sm:p-5">
              <div className="mb-3 text-[11px] font-bold tracking-wide text-muted">
                {p.single_subjects_label || 'المواد المفردة'}
              </div>
              {singles.length === 0 ? (
                <p className="text-[13px] text-muted-dim">{p.empty_subjects}</p>
              ) : (
                <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                  {singles.map((plan) => (
                    <li
                      key={plan.id}
                      className="flex flex-wrap items-center justify-between gap-3 bg-white/[.02] px-4 py-3"
                    >
                      <span className="text-[14px] font-semibold">{plan.subject?.name || plan.name}</span>
                      <div className="flex items-center gap-3">
                        <PriceLine plan={plan} currency={p.currency} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onRegister({
                              stageId: activeStage.id,
                              gradeId: activeGrade.id,
                              planId: plan.id,
                            })
                          }
                        >
                          سجّل
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => onRegister({ stageId: activeStage.id, gradeId: activeGrade.id })}
            >
              {p.program_cta || 'سجّل الآن'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onVip({ stageId: activeStage.id, gradeId: activeGrade.id })}
            >
              <Icon name="fa-solid fa-crown" className="me-2" />
              {p.vip_cta || 'طلب حصة VIP'}
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
