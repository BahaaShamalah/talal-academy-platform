import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest) {
  const gradeId = req.nextUrl.searchParams.get('grade_id');
  const qs = gradeId
    ? `?filter[grade_id]=${gradeId}&include=subject,productType,installmentTemplate&per_page=100`
    : '?include=subject,productType,installmentTemplate&per_page=100';
  const res = await backendFetch(`/public/plans${qs}`, { token: null });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
