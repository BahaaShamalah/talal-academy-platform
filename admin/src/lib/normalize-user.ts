import type { AuthUser } from '@/lib/auth';

export function normalizeAuthUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as Record<string, unknown>;
  const user = (root.data ?? root.user ?? root) as Record<string, unknown>;

  if (!user || typeof user.id !== 'number') return null;

  return {
    id: user.id as number,
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    phone: (user.phone as string | null) ?? null,
    roles: Array.isArray(user.roles) ? (user.roles as string[]) : [],
    permissions: Array.isArray(user.permissions)
      ? (user.permissions as string[])
      : [],
  };
}
