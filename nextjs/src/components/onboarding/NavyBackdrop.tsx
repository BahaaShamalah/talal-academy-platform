/** Shared motion backdrop: drifting dots, breathing blobs, rotating rings, sparkles. */
export default function NavyBackdrop({ sparkles = true }: { sparkles?: boolean }) {
  return (
    <>
      <div className="dots-layer pointer-events-none absolute inset-0 animate-dotsPan opacity-[.34]" />
      <div className="pointer-events-none absolute -right-[16%] -top-[14%] aspect-square w-[min(420px,60%)] animate-blobA rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(212,169,54,.3),transparent_68%)] blur-[16px]" />
      <div className="pointer-events-none absolute -bottom-[12%] -left-[18%] aspect-square w-[min(400px,58%)] animate-blobB rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(28,75,143,.5),transparent_68%)] blur-[18px]" />
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute -top-[8%] left-1/2 h-auto w-[min(560px,120%)] -translate-x-1/2 animate-spinSlow opacity-50" fill="none">
        <circle cx="100" cy="100" r="88" stroke="rgba(212,169,54,.2)" strokeWidth=".7" strokeDasharray="3 7" />
        <circle cx="100" cy="100" r="64" stroke="rgba(212,169,54,.14)" strokeWidth=".7" />
        <rect x="86" y="8" width="9" height="9" rx="2" fill="rgba(212,169,54,.5)" transform="rotate(20 90 12)" />
        <circle cx="184" cy="112" r="4" fill="rgba(212,169,54,.45)" />
        <rect x="18" y="132" width="7" height="7" rx="2" fill="rgba(226,198,127,.4)" />
      </svg>
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-[14%] -right-[6%] h-auto w-[300px] animate-spinRev opacity-40" fill="none">
        <polygon points="100,20 174,150 26,150" stroke="rgba(212,169,54,.22)" strokeWidth="1" fill="none" />
      </svg>
      {sparkles && (
        <>
          <i className="fa-solid fa-star pointer-events-none absolute left-[12%] top-[22%] animate-sparkle text-[9px] text-gold-soft" />
          <i className="fa-solid fa-star pointer-events-none absolute right-[14%] top-[58%] animate-sparkle text-[7px] text-gold-soft [animation-delay:1.2s]" />
          <i className="fa-solid fa-star pointer-events-none absolute bottom-[26%] left-[20%] animate-sparkle text-[8px] text-gold [animation-delay:.6s]" />
        </>
      )}
    </>
  );
}
