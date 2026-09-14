import Icon from '../ui/Icon';

export default function EmptyState({
  icon, title, body, primary, secondary,
}: {
  icon: string; title: string; body: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-dashed border-[#ded5c2] bg-cream-soft text-[26px] text-gold">
        <Icon name={icon} />
      </div>
      <h3 className="mt-4 font-display text-[19px] font-bold text-navy-800">{title}</h3>
      <p className="mx-auto mb-5 mt-1.5 max-w-[330px] text-[13.5px] leading-[1.8] text-ink-dim">{body}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {primary && (
          <button onClick={primary.onClick} className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy transition-transform hover:-translate-y-0.5">
            <Icon name="fa-solid fa-plus" className="text-[12px]" /> {primary.label}
          </button>
        )}
        {secondary && (
          <button onClick={secondary.onClick} className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft">
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
