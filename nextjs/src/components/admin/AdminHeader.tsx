'use client';
import { useRouter } from 'next/navigation';
import Icon from '../ui/Icon';

export default function AdminHeader({ title, crumb }: { title: string; crumb?: string }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between gap-3.5 border-b border-cream-line bg-[#fffefb] px-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="font-display whitespace-nowrap text-[20px] font-bold text-navy-800">{title}</h1>
        {crumb && <span className="whitespace-nowrap text-[12px] text-ink-faint">{crumb}</span>}
      </div>

      <div className="flex items-center gap-2">
        <button aria-label="بحث" className="h-9 w-9 rounded-[11px] border border-cream-line bg-white text-ink-dim">
          <Icon name="fa-solid fa-magnifying-glass" className="text-[13px]" />
        </button>
        <button aria-label="الإشعارات" className="relative h-9 w-9 rounded-[11px] border border-cream-line bg-white text-ink-dim">
          <Icon name="fa-regular fa-bell" className="text-[13.5px]" />
          <span className="absolute left-[7px] top-1.5 h-[7px] w-[7px] rounded-full bg-gold" />
        </button>
        <div className="h-6 w-px bg-cream-line" />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[13px] font-bold text-navy-800">أ. طلال العنزي</div>
            <div className="text-[11px] text-ink-dim">مدير النظام · Admin</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-[13px] font-bold text-gold-soft">ط.ع</div>
        </div>
        <button
          onClick={() => router.push('/admin/login')}
          className="flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3 py-2 text-[12.5px] font-semibold text-[#8a3a3a] transition-transform hover:-translate-y-px"
        >
          <Icon name="fa-solid fa-arrow-right-from-bracket" className="text-[12px]" /> خروج
        </button>
      </div>
    </header>
  );
}
