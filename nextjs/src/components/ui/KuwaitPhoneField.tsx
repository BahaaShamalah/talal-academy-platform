'use client';

import { cn } from '@/lib/cn';

export function localKuwaitDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00965')) digits = digits.slice(5);
  else if (digits.startsWith('965')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 8);
}

export default function KuwaitPhoneField({
  id,
  name,
  value,
  onChange,
  required,
  placeholder = '5XXXXXXX',
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (local: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      dir="ltr"
      className={cn(
        'flex overflow-hidden rounded-xl border border-gold/25 bg-white/[.06] focus-within:border-gold',
        className,
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5 border-r border-gold/25 bg-white/[.04] px-3 text-[13px] font-bold text-gold-soft">
        <span aria-hidden>🇰🇼</span>
        <span className="font-latin">+965</span>
      </span>
      <input
        id={id}
        name={name}
        required={required}
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={8}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(localKuwaitDigits(e.target.value))}
        className="min-w-0 flex-1 bg-transparent px-3 py-3.5 font-latin text-[14px] text-white placeholder:text-muted-dim focus:outline-none"
      />
    </div>
  );
}
