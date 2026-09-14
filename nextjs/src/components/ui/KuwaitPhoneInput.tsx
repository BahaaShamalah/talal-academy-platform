'use client';

import { cn } from '@/lib/cn';
import { kuwaitLocalDigits, normalizeKuwaitPhone } from '@/lib/kuwait-phone';

function KuwaitFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 21 15"
      className={cn('h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px]', className)}
      aria-hidden
    >
      <rect width="21" height="5" y="0" fill="#007a3d" />
      <rect width="21" height="5" y="5" fill="#fff" />
      <rect width="21" height="5" y="10" fill="#ce1126" />
      <polygon points="0,0 7.5,7.5 0,15" fill="#000" />
    </svg>
  );
}

type Props = {
  value: string;
  onChange?: (fullPhone: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
};

/** هاتف كويتي بمقدمة +965 ثابتة وعلم الكويت */
export default function KuwaitPhoneInput({
  value,
  onChange,
  id,
  placeholder = '5XXXXXXX',
  className,
  inputClassName,
  disabled = false,
  required = false,
}: Props) {
  const local = kuwaitLocalDigits(value);

  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-xl border border-[#ece6d8] bg-white focus-within:border-gold',
        disabled && 'bg-[#f7f4ec] opacity-90',
        className,
      )}
      dir="ltr"
    >
      <span className="flex shrink-0 items-center gap-1.5 border-e border-[#ece6d8] bg-[#f7f4ec] px-3 text-[13px] font-bold text-navy-800">
        <KuwaitFlag />
        <span className="font-latin">+965</span>
      </span>
      <input
        id={id}
        className={cn(
          'min-w-0 flex-1 bg-transparent px-3 py-3 font-latin text-[14px] text-[#1c1a17] outline-none placeholder:text-[#b0a897]',
          inputClassName,
        )}
        dir="ltr"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={local}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(normalizeKuwaitPhone(e.target.value))}
        onPaste={(e) => {
          if (disabled || !onChange) return;
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
