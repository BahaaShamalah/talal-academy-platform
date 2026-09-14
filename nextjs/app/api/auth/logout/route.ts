import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server-api';
import { cookies } from 'next/headers';

export async function POST() {
  await backendFetch('/guardian/logout', { method: 'POST' });
  cookies().delete('guardian_token');
  return NextResponse.json({ ok: true });
}
