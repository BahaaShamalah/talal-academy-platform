import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth';

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setHydrated: (value: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  logoutLocal: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
  hasAnyPermission: (permissions) =>
    permissions.some((p) => get().user?.permissions.includes(p) ?? false),
  hasRole: (role) => get().user?.roles.includes(role) ?? false,
  logoutLocal: () => set({ user: null }),
}));
