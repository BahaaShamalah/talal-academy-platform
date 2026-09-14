import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const res = await backendFetch(`/guardian/invoices${qs ? `?${qs}` : ''}`);
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
