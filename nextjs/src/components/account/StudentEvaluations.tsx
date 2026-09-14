'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type EvaluationLevelRating,
  type GuardianEvaluation,
  evaluationLevelLabel,
  formatScorePair,
  unwrapList,
} from '@/lib/account';
import Icon from '@/components/ui/Icon';

const LEVEL_TONE: Record<EvaluationLevelRating, string> = {
  excellent: 'bg-[#e9f3ec] text-[#2e7d4f]',
  good: 'bg-[#eaf0f8] text-[#1c4b8f]',
  needs_follow_up: 'bg-[#fff3e6] text-[#c47a1a]',
};

const CRITERIA: { key: keyof GuardianEvaluation; label: string }[] = [
  { key: 'participation_rating', label: 'المشاركة' },
  { key: 'understanding_rating', label: 'الفهم' },
  { key: 'homework_rating', label: 'الواجبات' },
  { key: 'discipline_rating', label: 'الانضباط' },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" aria-label={`${value} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="fa-solid fa-star"
          className={`text-[10px] ${i < value ? 'text-gold' : 'text-[#e2dccf]'}`}
        />
      ))}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export default function StudentEvaluations({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<GuardianEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guardian/students/${studentId}/evaluations?per_page=50`);
      if (res.ok) setRows(unwrapList<GuardianEvaluation>(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-extrabold">التقييمات</h3>

      {loading ? (
        <p className="text-[13px] text-[#8a8478]">جاري تحميل التقييمات…</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[#8a8478]">لا توجد تقييمات بعد</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((ev) => {
            const scoreText = formatScorePair(ev.numeric_score, ev.numeric_score_max);
            const criteria = CRITERIA.filter((c) => {
              const v = ev[c.key];
              return typeof v === 'number' && v >= 1;
            });

            return (
              <li key={ev.id} className="rounded-xl border border-[#f0ebe0] bg-[#fbfaf7] px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[#1c1a17]">
                      {ev.class_offering?.subject?.name ?? `مادة #${ev.class_offering_id}`}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8478]">{formatDate(ev.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {scoreText ? (
                      <span className="font-latin text-[13px] font-bold text-navy-800" dir="ltr">
                        {scoreText}
                      </span>
                    ) : null}
                    {ev.level_rating ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[ev.level_rating]}`}
                      >
                        {evaluationLevelLabel(ev.level_rating)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {criteria.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {criteria.map((c) => (
                      <div key={c.key} className="flex items-center gap-1.5 text-[12px] text-[#5c564c]">
                        <span>{c.label}</span>
                        <Stars value={Number(ev[c.key])} />
                      </div>
                    ))}
                  </div>
                ) : null}

                {ev.note ? (
                  <p className="mt-2.5 text-[12px] leading-relaxed text-[#8a8478]">{ev.note}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
