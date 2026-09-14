'use client';

import { useMemo, useState } from 'react';
import { allJahraSchools, JAHRA_SCHOOL_LEVELS, JAHRA_SCHOOLS } from '@/lib/jahra-schools';

const field =
  'w-full rounded-xl border border-[#e8e2d6] bg-white px-3.5 py-2.5 text-[13.5px] text-[#1a1a1a] focus:border-[#c8a24a] focus:outline-none';

const OTHER_VALUE = '__other__';

type SchoolSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SchoolSelect({ value, onChange, className }: SchoolSelectProps) {
  const known = useMemo(() => new Set(allJahraSchools()), []);
  const startsAsOther = Boolean(value && !known.has(value));

  const [otherMode, setOtherMode] = useState(startsAsOther);
  const [otherText, setOtherText] = useState(startsAsOther ? value : '');

  const selectValue = otherMode ? OTHER_VALUE : value;

  function handleSelectChange(next: string) {
    if (next === OTHER_VALUE) {
      setOtherMode(true);
      onChange(otherText.trim());
      return;
    }
    setOtherMode(false);
    setOtherText('');
    onChange(next);
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text);
    onChange(text.trim());
  }

  return (
    <div className="space-y-2">
      <select
        className={className ?? field}
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
      >
        <option value="">اختر المدرسة…</option>
        {JAHRA_SCHOOL_LEVELS.map((level) => (
          <optgroup key={level.id} label={level.label}>
            {JAHRA_SCHOOLS[level.id].map((school) => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_VALUE}>مدرسة أخرى</option>
      </select>
      {otherMode ? (
        <input
          className={className ?? field}
          placeholder="اكتب اسم المدرسة"
          value={otherText}
          onChange={(e) => handleOtherTextChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
