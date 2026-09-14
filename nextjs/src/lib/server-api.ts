/**
 * Server-side API helpers that proxy requests to the Laravel backend.
 * Used by Route Handlers only — never imported on the client.
 */
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export function getToken(): string | undefined {
  return cookies().get('guardian_token')?.value;
}

export async function backendFetch(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<Response> {
  const { token, ...rest } = init ?? {};
  const usedToken = token ?? getToken();
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (usedToken) headers['Authorization'] = `Bearer ${usedToken}`;

  const controller = new AbortController();
  const timeoutMs = isFormData ? 30000 : 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  rest.signal?.addEventListener('abort', onAbort);

  try {
    return await fetch(`${BACKEND}/api/v1${path}`, {
      ...rest,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        message: aborted ? 'انتهت مهلة الاتصال بالخادم.' : 'تعذر الاتصال بالخادم.',
      }),
      { status: aborted ? 504 : 502, headers: { 'Content-Type': 'application/json' } },
    );
  } finally {
    clearTimeout(timer);
    rest.signal?.removeEventListener('abort', onAbort);
  }
}

export async function jsonOr<T>(res: Response, fallback?: T): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return (fallback ?? null) as T;
  }
}
