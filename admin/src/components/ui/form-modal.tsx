'use client';

import { Icon } from '@/components/ui/icon';

const field =
  'w-full rounded-xl border border-cream-line2 bg-white px-3.5 py-2.5 text-[13.5px] text-ink focus:border-gold focus:outline-none';
const labelCls = 'mb-1.5 block text-[12.5px] font-semibold text-ink-soft';

export function FormModal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  wide,
  extraWide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}) {
  if (!open) return null;

  const widthClass = extraWide ? 'max-w-[860px]' : wide ? 'max-w-[720px]' : 'max-w-[560px]';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy/55 px-4 pb-6 pt-14 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-[22px] bg-cream shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)] ${widthClass}`}
      >
        <div className="flex items-center justify-between bg-navy-800 px-5 py-4">
          <div>
            {eyebrow ? (
              <div className="font-latin text-[10px] tracking-[.22em] text-gold">{eyebrow}</div>
            ) : null}
            <h2 className="font-display mt-1 text-[19px] font-bold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="h-[34px] w-[34px] rounded-[11px] border border-white/20 text-gold-soft"
          >
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-cream-line bg-white px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  loading,
  confirmLabel = 'حذف',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  loading?: boolean;
  confirmLabel?: string;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/55 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] overflow-hidden rounded-[22px] bg-cream shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)]"
      >
        <div className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8ecec] text-[22px] text-[#a34b4b]">
            <Icon name="fa-solid fa-trash" />
          </div>
          <h3 className="font-display mt-4 text-[18px] font-bold text-navy-800">{title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-dim">{body}</p>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-cream-line bg-white px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-[#a34b4b] px-5 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
          >
            {loading ? 'جاري الحذف…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { field as formFieldClass, labelCls as formLabelClass };
