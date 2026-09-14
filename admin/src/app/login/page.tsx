import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(110%_90%_at_78%_6%,#123163,#0b234a_45%,#061a3a_100%)] px-5 py-10">
      <div className="dots-layer pointer-events-none absolute inset-0 opacity-45" />
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -top-32 left-1/2 h-[640px] w-[640px] -translate-x-1/2 opacity-50"
        fill="none"
      >
        <circle cx="200" cy="200" r="170" stroke="rgba(212,169,54,.26)" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="122" stroke="rgba(212,169,54,.14)" strokeWidth="1.2" />
      </svg>

      <div className="relative z-10 w-full max-w-[400px]">
        <Suspense fallback={<div className="text-center text-white">…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
