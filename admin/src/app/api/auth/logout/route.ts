import { NextResponse } from 'next/server';
import { AUTH_COOKIE, getApiBaseUrl } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;

  if (token) {
    await fetch(`${getApiBaseUrl()}/api/v1/logout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);
  }

  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
