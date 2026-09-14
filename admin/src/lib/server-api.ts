import { AUTH_COOKIE, getApiBaseUrl, type AuthUser } from '@/lib/auth';
import { normalizeAuthUser } from '@/lib/normalize-user';
import { cookies } from 'next/headers';

function normalizeUser(payload: unknown): AuthUser | null {
  return normalizeAuthUser(payload);
}

export async function getToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data?: T; error?: string; status: number }> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (res.status === 204) {
    return { status: res.status };
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      status: res.status,
      error:
        json?.message ??
        json?.errors?.email?.[0] ??
        'حدث خطأ غير متوقع',
    };
  }

  return { data: json as T, status: res.status };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;

  const result = await apiFetch<unknown>('/me');
  if (!result.data) return null;
  return normalizeUser(result.data);
}
