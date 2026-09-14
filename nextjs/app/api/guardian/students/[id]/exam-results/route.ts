import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const qs = req.nextUrl.searchParams.toString();
  const suffix = qs ? `?${qs}` : '?per_page=50';
  const res = await backendFetch(`/guardian/students/${params.id}/exam-results${suffix}`);
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
