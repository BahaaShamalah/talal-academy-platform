import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await backendFetch('/payments/myfatoorah/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
