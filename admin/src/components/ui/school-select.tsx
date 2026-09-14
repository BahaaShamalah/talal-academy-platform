'use client';

import { useMemo, useState } from 'react';
import { allJahraSchools, JAHRA_SCHOOL_LEVELS, JAHRA_SCHOOLS } from '@/lib/jahra-schools';
import { formFieldClass } from '@/components/ui/form-modal';

const OTHER_VALUE = '__other__';

type SchoolSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
};

export function SchoolSelect({ value, onChange, className, required }: SchoolSelectProps) {
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
        className={className ?? formFieldClass}
        value={selectValue}
        required={required && !otherMode}
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
          className={className ?? formFieldClass}
          placeholder="اكتب اسم المدرسة"
          value={otherText}
          required={required}
          onChange={(e) => handleOtherTextChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
