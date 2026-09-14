'use client';
import { cn } from '@/lib/cn';

type Variant = 'gold' | 'outline' | 'ghost';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

const base = 'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

const variants: Record<Variant, string> = {
  gold: 'bg-gradient-to-br from-gold-soft to-gold text-navy shadow-gold',
  outline: 'bg-white/5 border border-gold/50 text-[#f0e6cf]',
  ghost: 'bg-white/5 border border-gold/35 text-[#e9edf5] font-medium',
};

const sizes = { sm: 'text-sm px-4 py-2.5', md: 'text-[15px] px-6 py-3.5', lg: 'text-[17px] px-8 py-4' };

export default function Button({ variant = 'gold', size = 'md', className, ...rest }: Props) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}
