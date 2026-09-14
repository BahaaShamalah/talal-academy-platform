'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Guardian, Student } from '@/lib/account';
import { unwrapList, unwrapOne } from '@/lib/account';
import { PORTAL_STUDENTS_QS, readStoredStudentId, storeStudentId } from '@/lib/portal';

/** Same ballpark as admin React Query staleTime — me/students are not live-second data. */
const PORTAL_PROFILE_STALE_MS = 30_000;

type ProfileCache = {
  guardian: Guardian | null;
  students: Student[];
  fetchedAt: number;
};

let profileCache: ProfileCache | null = null;

export function clearPortalProfileCache() {
  profileCache = null;
}

function cacheFresh(): boolean {
  return Boolean(profileCache && Date.now() - profileCache.fetchedAt < PORTAL_PROFILE_STALE_MS);
}

type PortalContextValue = {
  guardian: Guardian | null;
  students: Student[];
  selectedStudent: Student | null;
  selectedStudentId: number | null;
  setSelectedStudentId: (id: number) => void;
  setGuardian: (guardian: Guardian | null) => void;
  loading: boolean;
  error: string;
  retry: () => void;
  refreshStudents: () => Promise<void>;
  refreshGuardian: () => Promise<void>;
  logout: () => Promise<void>;
  loggingOut: boolean;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}

export function usePortalOptional() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [guardian, setGuardian] = useState<Guardian | null>(profileCache?.guardian ?? null);
  const [students, setStudents] = useState<Student[]>(profileCache?.students ?? []);
  const [selectedStudentId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(!cacheFresh());
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const applyStudents = useCallback((list: Student[]) => {
    setStudents(list);
    const stored = readStoredStudentId();
    const nextId =
      (stored && list.some((s) => s.id === stored) ? stored : null) ?? list[0]?.id ?? null;
    setSelectedId(nextId);
    if (nextId) storeStudentId(nextId);
  }, []);

  const fetchProfile = useCallback(
    async (force: boolean) => {
      if (!force && cacheFresh() && profileCache) {
        setGuardian(profileCache.guardian);
        applyStudents(profileCache.students);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        // Default browser fetch cache — not no-store (schedule endpoints keep no-store separately).
        const meRes = await fetch('/api/guardian/me');
        if (meRes.status === 401) {
          clearPortalProfileCache();
          router.replace('/login');
          return;
        }
        if (!meRes.ok) {
          setError('تعذّر تحميل حساب ولي الأمر');
          return;
        }
        const nextGuardian = unwrapOne<Guardian>(await meRes.json());

        const stRes = await fetch(`/api/guardian/students?${PORTAL_STUDENTS_QS}`);
        if (!stRes.ok) {
          setError('تعذّر تحميل بيانات الأبناء');
          return;
        }
        const list = unwrapList<Student>(await stRes.json());
        profileCache = {
          guardian: nextGuardian,
          students: list,
          fetchedAt: Date.now(),
        };
        setGuardian(nextGuardian);
        applyStudents(list);
      } catch {
        setError('حدث خطأ في الاتصال');
      } finally {
        setLoading(false);
      }
    },
    [applyStudents, router],
  );

  useEffect(() => {
    void fetchProfile(false);
  }, [fetchProfile]);

  // Refetch when tab becomes visible again and cache is stale (React Query-style focus).
  useEffect(() => {
    function onFocus() {
      if (!cacheFresh()) void fetchProfile(false);
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') onFocus();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchProfile]);

  const refreshStudents = useCallback(async () => {
    const stRes = await fetch(`/api/guardian/students?${PORTAL_STUDENTS_QS}`);
    if (!stRes.ok) return;
    const list = unwrapList<Student>(await stRes.json());
    profileCache = {
      guardian: profileCache?.guardian ?? guardian,
      students: list,
      fetchedAt: Date.now(),
    };
    applyStudents(list);
  }, [applyStudents, guardian]);

  const refreshGuardian = useCallback(async () => {
    const meRes = await fetch('/api/guardian/me');
    if (!meRes.ok) return;
    const nextGuardian = unwrapOne<Guardian>(await meRes.json());
    profileCache = {
      guardian: nextGuardian,
      students: profileCache?.students ?? students,
      fetchedAt: Date.now(),
    };
    setGuardian(nextGuardian);
  }, [students]);

  const setSelectedStudentId = useCallback((id: number) => {
    setSelectedId(id);
    storeStudentId(id);
  }, []);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    clearPortalProfileCache();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
    }
  }, [router]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  const value = useMemo<PortalContextValue>(
    () => ({
      guardian,
      students,
      selectedStudent,
      selectedStudentId,
      setSelectedStudentId,
      setGuardian,
      loading,
      error,
      retry: () => void fetchProfile(true),
      refreshStudents,
      refreshGuardian,
      logout,
      loggingOut,
    }),
    [
      guardian,
      students,
      selectedStudent,
      selectedStudentId,
      setSelectedStudentId,
      loading,
      error,
      fetchProfile,
      refreshStudents,
      refreshGuardian,
      logout,
      loggingOut,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
