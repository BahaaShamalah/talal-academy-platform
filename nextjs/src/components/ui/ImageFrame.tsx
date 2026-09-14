import Image from 'next/image';
import { cn } from '@/lib/cn';

/** Real photo when `src` is set, otherwise a labelled placeholder. */
export default function ImageFrame({
  src, alt, placeholder, className, priority,
}: {
  src?: string;
  alt?: string;
  placeholder: string;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    const remote = src.startsWith('http://') || src.startsWith('https://');
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {remote ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? placeholder} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Image src={src} alt={alt ?? placeholder} fill sizes="(max-width:960px) 100vw, 480px" priority={priority} className="object-cover" />
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center border border-dashed border-gold/35 bg-white/[.04] p-4 text-center text-xs leading-relaxed text-muted-dim',
        className,
      )}
    >
      {placeholder}
    </div>
  );
}
