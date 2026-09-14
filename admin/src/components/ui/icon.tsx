import { cn } from '@/lib/utils';

export function Icon({ name, className }: { name: string; className?: string }) {
  return <i className={cn(name, className)} aria-hidden />;
}
