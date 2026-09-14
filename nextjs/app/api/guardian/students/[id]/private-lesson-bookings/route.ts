import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const status = req.nextUrl.searchParams.get('status');
  const qs = status ? `?filter[status]=${status}&per_page=50` : '?per_page=50';
  const res = await backendFetch(`/guardian/students/${params.id}/private-lesson-bookings${qs}`);
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
