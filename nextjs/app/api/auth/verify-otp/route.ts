import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await backendFetch('/guardian/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    token: null,
  });
  const data = await jsonOr<{
    token?: string;
    token_type?: string;
    is_new_guardian?: boolean;
    guardian?: unknown;
    message?: string;
  }>(res);

  if (res.ok && data.token) {
    cookies().set('guardian_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const { token: _token, token_type: _tokenType, ...safe } = data;
  return NextResponse.json(safe, { status: res.status });
}
