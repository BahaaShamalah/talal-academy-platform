import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server-api';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/guardian/invoices/${params.id}/html`, {
    headers: { Accept: 'text/html' },
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ message: text || 'تعذّر عرض الفاتورة' }, { status: res.status });
    }
  }

  const html = await res.text();

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
