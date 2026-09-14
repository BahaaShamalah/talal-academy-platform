import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; installmentId: string } },
) {
  const res = await backendFetch(
    `/guardian/invoices/${params.id}/installments/${params.installmentId}/pay`,
    { method: 'POST' },
  );
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
