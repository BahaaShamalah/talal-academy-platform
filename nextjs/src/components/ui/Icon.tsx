import { cn } from '@/lib/cn';

export default function Icon({ name, className }: { name: string; className?: string }) {
  return <i className={cn(name, className)} aria-hidden="true" />;
}
