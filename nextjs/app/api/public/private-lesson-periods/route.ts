import { NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET() {
  const res = await backendFetch('/public/private-lesson-periods', { token: null });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
