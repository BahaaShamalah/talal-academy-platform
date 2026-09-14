import { NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(
  _req: Request,
  { params }: { params: { gradeId: string } },
) {
  const res = await backendFetch(`/public/grades/${params.gradeId}/subjects`, { token: null });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
