import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(req: NextRequest) {
  const gradeId = req.nextUrl.searchParams.get('grade_id');
  const subjectId = req.nextUrl.searchParams.get('subject_id');
  const params = new URLSearchParams();
  params.set('include', 'grade,subject,teacher');
  params.set('per_page', '100');
  if (gradeId) params.set('filter[grade_id]', gradeId);
  if (subjectId) params.set('filter[subject_id]', subjectId);
  const res = await backendFetch(`/public/private-lesson-offers?${params}`, { token: null });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
