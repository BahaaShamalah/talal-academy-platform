'use client';

import { MobileNav, Sidebar } from '@/components/layout/sidebar';
import { TeacherBottomNav } from '@/components/layout/teacher-bottom-nav';
import { isTeacherOnly } from '@/lib/dashboard-routes';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const teacherOnly = isTeacherOnly(user);

  return (
    <div
      className={cn(
        'flex min-h-screen bg-cream',
        teacherOnly && 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0',
      )}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Teachers get bottom tabs; keep top hamburger for staff only */}
        {teacherOnly ? null : <MobileNav />}
        {children}
      </div>
      {teacherOnly ? <TeacherBottomNav /> : null}
    </div>
  );
}
