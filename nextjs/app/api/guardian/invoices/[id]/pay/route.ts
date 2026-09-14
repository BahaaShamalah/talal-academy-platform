import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/guardian/invoices/${params.id}/pay`, { method: 'POST' });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
