import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await backendFetch('/public/contact-messages', {
    token: null,
    method: 'POST',
    body,
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
