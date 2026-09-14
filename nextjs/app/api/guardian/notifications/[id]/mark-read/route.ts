import { NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/guardian/notifications/${params.id}/mark-read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
