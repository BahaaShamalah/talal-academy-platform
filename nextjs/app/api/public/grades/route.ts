import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest) {
  const stageId = req.nextUrl.searchParams.get('stage_id');
  const qs = stageId ? `?filter[educational_stage_id]=${stageId}` : '';
  const res = await backendFetch(`/public/grades${qs}`, { token: null });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
