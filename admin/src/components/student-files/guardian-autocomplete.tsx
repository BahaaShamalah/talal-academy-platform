'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { apiClient, qs, type Guardian, type Paginated } from '@/lib/api-client';

export function GuardianAutocomplete({
  selectedId,
  selectedLabel,
  onSelect,
}: {
  selectedId: string;
  selectedLabel?: string;
  onSelect: (id: string, label: string, phone?: string) => void;
}) {
  const [query, setQuery] = useState(selectedLabel ?? '');
  const debouncedQuery = useDebouncedValue(query, 400);
  const [focused, setFocused] = useState(false);

  const isPhone = /^\d+$/.test(debouncedQuery.trim());

  const guardiansQuery = useQuery({
    queryKey: ['guardians-search', debouncedQuery],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 20 };
      if (debouncedQuery.trim().length >= 2) {
        if (isPhone) {
          params['filter[phone]'] = debouncedQuery.trim();
        } else {
          params['filter[full_name]'] = debouncedQuery.trim();
        }
      }
      return apiClient<Paginated<Guardian>>(`/guardians${qs(params)}`);
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results = guardiansQuery.data?.data ?? [];
  const showDropdown = focused && debouncedQuery.trim().length >= 2;

  return (
    <div className="relative">
      <label className={formLabelClass}>ابحث عن ولي الأمر (بالاسم أو الهاتف)</label>
      <input
        className={formFieldClass}
        value={query}
        placeholder="اكتب اسم ولي الأمر أو رقم الهاتف…"
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value.trim()) onSelect('', '');
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
      />
      {selectedId ? (
        <div className="mt-2 rounded-xl border border-[#e9f3ec] bg-[#f8fcf9] px-3 py-2 text-[13px] text-[#2e7d4f]">
          تم الاختيار: {selectedLabel || `#${selectedId}`}
        </div>
      ) : null}
      {showDropdown ? (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-cream-line2 bg-white shadow-lg">
          {guardiansQuery.isLoading ? (
            <div className="px-3 py-2.5 text-[13px] text-ink-dim">جاري البحث…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2.5 text-[13px] text-ink-dim">لا توجد نتائج</div>
          ) : (
            results.map((g) => (
              <button
                key={g.id}
                type="button"
                className="block w-full border-b border-[#f4f1ea] px-3 py-2.5 text-right text-[13px] hover:bg-cream-soft"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(String(g.id), `${g.full_name} — ${g.phone}`, g.phone);
                  setQuery(`${g.full_name} — ${g.phone}`);
                  setFocused(false);
                }}
              >
                <span className="font-semibold text-ink">{g.full_name}</span>
                <span className="font-latin mr-2 text-ink-dim">{g.phone}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
