import { NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/public/private-lesson-offers/${params.id}/slots?per_page=100`, {
    token: null,
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
