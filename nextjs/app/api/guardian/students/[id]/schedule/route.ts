import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  const view = sp.get('view');
  const date = sp.get('date');
  if (view) qs.set('view', view);
  if (date) qs.set('date', date);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await backendFetch(`/guardian/students/${params.id}/schedule${suffix}`);
  const data = await jsonOr(res);
  return NextResponse.json(data, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
