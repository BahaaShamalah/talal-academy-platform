import type { AuthUser } from '@/lib/auth';

/** معلم فقط (بدون admin) → بوابة المعلم */
export function isTeacherOnly(user: Pick<AuthUser, 'roles'> | null | undefined): boolean {
  if (!user) return false;
  return user.roles.includes('teacher') && !user.roles.includes('admin');
}

export function defaultDashboardPath(user: Pick<AuthUser, 'roles'> | null | undefined): string {
  return isTeacherOnly(user) ? '/dashboard/my-portal' : '/dashboard';
}
