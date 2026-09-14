import { cn } from '@/lib/cn';

/** Full-bleed page background; content aligned to the same width as the hero. */
export default function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('page-bg app-pad relative flex min-h-[calc(100svh-70px)] flex-col overflow-hidden', className)}>
      <div className="dots-layer pointer-events-none absolute inset-0 opacity-[.28]" />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,169,54,.12),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(18,49,99,.5),transparent_70%)]" />
      <div className="relative z-[1] mx-auto flex w-full max-w-[1560px] flex-1 flex-col justify-center gap-8 px-4 py-[clamp(32px,5vw,64px)] sm:px-10 lg:gap-10">
        {children}
      </div>
    </section>
  );
}
