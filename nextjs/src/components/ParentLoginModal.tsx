'use client';

import Icon from './ui/Icon';
import ParentOtpForm from './auth/ParentOtpForm';

type Props = {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
};

export default function ParentLoginModal({ open, onClose, onAuthenticated }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[400px] overflow-hidden rounded-[24px] bg-[#f8f5ee] text-[#1c1a17]">
        <div className="flex items-center justify-between bg-navy-800 px-5 py-4 text-white">
          <h3 className="text-[17px] font-extrabold">تسجيل الدخول</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="h-9 w-9 rounded-xl border border-white/20 text-gold"
          >
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="p-5">
          <ParentOtpForm
            defaultRedirect="/portal"
            onAuthenticated={() => {
              onAuthenticated?.();
              onClose();
            }}
            onCancel={onClose}
            showCancel
          />
        </div>
      </div>
    </div>
  );
}
