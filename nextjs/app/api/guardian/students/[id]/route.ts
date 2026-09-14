import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const res = await backendFetch(`/guardian/students/${params.id}`);
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const res = await backendFetch(`/guardian/students/${params.id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
