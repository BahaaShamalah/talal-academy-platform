import Image from 'next/image';
import Link from 'next/link';

export default function BrandMark({ sub = 'TALAL ACADEMY', href = '/' }: { sub?: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="طلال أكاديمي">
      <span className="flex flex-col text-right leading-none">
        <b className="font-display text-[17px] font-bold text-white">طلال أكاديمي</b>
        <span className="mt-1 font-[Marcellus,serif] text-[7px] tracking-[.24em] text-gold">{sub}</span>
      </span>
      <Image src="/assets/talal-symbol-light.png" alt="" width={36} height={36} className="object-contain" />
    </Link>
  );
}
