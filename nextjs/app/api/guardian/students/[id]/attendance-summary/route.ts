import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const res = await backendFetch(`/guardian/students/${params.id}/attendance-summary`);
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
