import { NextResponse } from 'next/server';
import { AUTH_COOKIE, getApiBaseUrl } from '@/lib/auth';
import { normalizeAuthUser } from '@/lib/normalize-user';

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${getApiBaseUrl()}/api/v1/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      device_name: 'admin-web',
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      {
        message:
          json?.message ??
          json?.errors?.email?.[0] ??
          'بيانات الدخول غير صحيحة',
      },
      { status: res.status },
    );
  }

  const user = normalizeAuthUser(json.user);
  if (!user) {
    return NextResponse.json({ message: 'تعذر قراءة بيانات المستخدم' }, { status: 502 });
  }

  const response = NextResponse.json({ user });

  response.cookies.set(AUTH_COOKIE, json.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
