'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthUser } from '@/lib/auth';

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setHydrated(true);
          }
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setUser(json.user);
          setHydrated(true);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialUser, setUser, setHydrated]);

  // Always render children so Next.js App Router hooks stay stable.
  return <>{children}</>;
}
