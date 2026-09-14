'use client';

import { formFieldClass } from '@/components/ui/form-modal';
import { normalizeKuwaitPhone, kuwaitLocalDigits } from '@/components/student-files/student-shared';
import { cn } from '@/lib/utils';

/** هاتف كويتي بمقدمة +965 ثابتة */
export function KuwaitPhoneInput({
  value,
  onChange,
  id,
  placeholder = 'XXXXXXXX',
  className,
}: {
  value: string;
  onChange: (fullPhone: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const local = kuwaitLocalDigits(value);

  return (
    <div className={cn('flex items-stretch gap-2', className)} dir="ltr">
      <span className="flex shrink-0 items-center rounded-xl border border-cream-line2 bg-cream-soft px-3 text-[13px] font-bold text-navy">
        +965
      </span>
      <input
        id={id}
        className={`${formFieldClass} font-latin`}
        dir="ltr"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={local}
        onChange={(e) => onChange(normalizeKuwaitPhone(e.target.value))}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text) {
            e.preventDefault();
            onChange(normalizeKuwaitPhone(text));
          }
        }}
      />
    </div>
  );
}
