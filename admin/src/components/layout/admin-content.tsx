import { cn } from '@/lib/utils';
import { adminContentClass } from '@/lib/layout';

/** Centered content shell — fixed max width 1024px for all admin pages. */
export function AdminContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={cn(adminContentClass, 'p-3.5 sm:p-5', className)}>{children}</main>;
}
