import { Suspense } from 'react';
import { TeacherLoginForm } from '@/components/auth/teacher-login-form';

export default function TeacherLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef3f6] px-5 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(80% 60% at 10% 0%, rgba(42,107,107,.12), transparent 55%), radial-gradient(70% 50% at 90% 100%, rgba(28,75,143,.08), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(#c5d4e0 1px, transparent 1px), linear-gradient(90deg, #c5d4e0 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        <Suspense fallback={<div className="text-center text-[#5a6b7a]">…</div>}>
          <TeacherLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
