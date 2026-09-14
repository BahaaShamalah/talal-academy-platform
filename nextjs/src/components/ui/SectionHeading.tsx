export default function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="animate-fadeUp text-center">
      <span className="font-latin text-xs tracking-[.3em] text-gold">{eyebrow}</span>
      <h2 className="mt-2 text-[clamp(26px,3.4vw,42px)] font-extrabold leading-tight">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}
